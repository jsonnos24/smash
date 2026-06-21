import "./ui/styles.css";
import { Vector3 } from "three";
import { SceneManager, type RenderItem } from "./renderer/scene";
import { ShatterField } from "./renderer/shatter";
import { WeaponFx } from "./renderer/weaponfx";
import { GameLoop } from "./engine/loop";
import { Session } from "./game/session";
import { Hud } from "./ui/hud";
import { Juice } from "./ui/juice";
import { Menus } from "./ui/menus";
import { InputController } from "./game/input";
import { AudioManager } from "./audio/audio";
import { loadSave, recordRun, saveSave } from "./persistence/save";
import { detectWebGL } from "./engine/perf";
import { ROOMS } from "./content/rooms";
import { START_BALLS, CHECKPOINT_SPACING, themeAt, speedAt } from "./content/endless";
import type { Mode } from "./game/state";

const app = document.getElementById("app")!;

if (!detectWebGL()) {
  app.innerHTML =
    '<div style="color:#dffff5;font-family:system-ui;display:flex;height:100%;align-items:center;justify-content:center;text-align:center;padding:24px">' +
    "Your browser doesn't support WebGL, which this game needs. Try a recent Chrome, Safari, Firefox, or Edge.</div>";
} else {
  bootstrap();
}

function bootstrap(): void {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
  app.appendChild(canvas);

  const scene = new SceneManager(canvas);
  const shatter = new ShatterField(scene.scene);
  const weaponFx = new WeaponFx(scene.scene, scene.camera);
  const hud = new Hud(app);
  const juice = new Juice(app);
  const audio = new AudioManager({ muted: loadSave().muted });
  const input = new InputController(canvas);

  let session: Session | null = null;
  let save = loadSave();
  let lastMode: Mode = "normal";

  const resize = () => scene.resize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", resize);
  resize();

  const BALL_RENDER_ID_OFFSET = 1_000_000; // keep ball ids from colliding with entity ids in scene.sync()

  const renderItems = (): RenderItem[] => {
    if (!session) return [];
    const items: RenderItem[] = session.colliders().map((c) => ({
      id: c.id,
      kind: c.kind,
      pos: c.box.getCenter(new Vector3()),
      size: (c.box.max.x - c.box.min.x) / 2,
      damaged: c.damaged,
      spin: c.spin,
    }));
    for (const ball of session.liveBalls) {
      items.push({
        id: BALL_RENDER_ID_OFFSET + ball.id,
        kind: "ball",
        pos: ball.pos,
        size: 0.25,
      });
    }
    return items;
  };

  const loop = new GameLoop({
    update: (dt) => {
      session?.update(dt);
      shatter.update(dt);
      juice.update(dt);
      weaponFx.update(dt);
      weaponFx.setOwned(session ? session.state.weapons : []);
      if (session) {
        scene.sync(renderItems());
        scene.setScroll(session.state.distance, 0);
        hud.update(session.state, START_BALLS, session.checkpoint);
        juice.speed(Math.min(1, Math.max(0, (speedAt(session.state.distance) - 1) / 0.45)));
        if (session.state.status !== "playing") endRun();
      } else {
        juice.speed(0);
      }
    },
    render: () => scene.render(),
  });

  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = "⏸";
  pauseBtn.setAttribute("aria-label", "Pause");
  pauseBtn.style.cssText =
    "position:absolute;bottom:12px;right:14px;z-index:1;pointer-events:auto;font-size:20px;line-height:1;background:rgba(0,0,0,.35);color:#dffff5;border:1px solid #7ffcd9;border-radius:8px;padding:4px 10px;cursor:pointer;font-family:system-ui;";
  pauseBtn.addEventListener("click", () => pauseGame());
  app.appendChild(pauseBtn);

  const menus = new Menus(app, save, {
    onStart: (mode, startDistance) => startRun(mode, startDistance),
    onResume: () => {
      menus.hide();
      loop.resume();
    },
    onRetry: () => startRun(lastMode),
    onMenu: () => {
      if (session) {
        save = recordRun(save, session.state.distance, session.state.score);
        saveSave(save);
        menus.setSave(save);
      }
      session = null;
      menus.showMain();
      loop.pause();
    },
    onToggleMute: (muted) => audio.setMuted(muted),
  });

  function pauseGame(): void {
    if (session && session.state.status === "playing") {
      loop.pause();
      menus.showPause();
    }
  }

  function endRun(): void {
    if (!session) return;
    const s = session;
    session = null;
    save = recordRun(save, s.state.distance, s.state.score);
    saveSave(save);
    menus.setSave(save);
    loop.pause();
    menus.showResults({ distance: Math.round(s.state.distance), best: save.bestDistance });
  }

  function startRun(mode: Mode, startDistance = 0): void {
    lastMode = mode;
    audio.unlock();
    const cpIndex = Math.floor(startDistance / CHECKPOINT_SPACING);
    let theme = themeAt(cpIndex);
    scene.setTheme(theme);
    audio.playMusic(theme);
    session = new Session(ROOMS, mode, scene.camera, Date.now() & 0xffff, {
      onShatter: (kind, at) => {
        const color = kind === "crystal" ? 0x7ffcd9 : kind === "powerup" ? 0xff5cc8 : 0x4fb3a3;
        shatter.burst(at, color);
        audio.playSfx(kind === "obstacle" ? "shatterGlass" : kind === "powerup" ? "powerup" : "shatterCrystal");
        const v = at.clone().project(scene.camera);
        if (v.z < 1) {
          const pts = kind === "crystal" ? 100 : kind === "powerup" ? 150 : 50;
          juice.popup(`+${pts}`, (v.x * 0.5 + 0.5) * window.innerWidth, (-v.y * 0.5 + 0.5) * window.innerHeight);
        }
      },
      onCrash: () => { scene.shake(0.9); audio.playSfx("crash"); juice.flash(); },
      onCheckpoint: (cp) => {
        theme = themeAt(Math.floor(cp / CHECKPOINT_SPACING));
        scene.setTheme(theme);
        audio.playMusic(theme);
        audio.playSfx("checkpoint");
      },
      onUpgradeChoice: (options) => {
        loop.pause();
        menus.showUpgrade(options, (id) => {
          session?.chooseUpgrade(id);
          menus.hide();
          loop.resume();
        });
      },
      onWeaponFire: (w, targets) => { audio.playSfx("powerup"); weaponFx.fire(w, targets); },
      onLoopStart: () => { audio.playSfx("loop"); },
    }, startDistance);
    menus.hide();
    loop.resume();
    if (!loop.running) loop.start();
  }

  input.onThrow((p) => {
    if (session) { audio.playSfx("throw"); session.throwBall(p); }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && session) { loop.pause(); menus.showPause(); }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") pauseGame();
  });

  menus.showMain();
  loop.start();
  loop.pause();
}
