import "./ui/styles.css";
import { Vector3 } from "three";
import { SceneManager, type RenderItem } from "./renderer/scene";
import { ShatterField } from "./renderer/shatter";
import { GameLoop } from "./engine/loop";
import { Session } from "./game/session";
import { Hud } from "./ui/hud";
import { Menus } from "./ui/menus";
import { InputController } from "./game/input";
import { AudioManager } from "./audio/audio";
import { loadSave, recordScore, saveSave } from "./persistence/save";
import { detectWebGL } from "./engine/perf";
import { LEVELS } from "./content/levels";
import { ROOMS } from "./content/rooms";
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
  const hud = new Hud(app);
  const audio = new AudioManager({ muted: loadSave().muted });
  const input = new InputController(canvas);

  let session: Session | null = null;
  let save = loadSave();

  const resize = () => scene.resize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", resize);
  resize();

  const renderItems = (): RenderItem[] => {
    if (!session) return [];
    return session.colliders().map((c) => ({
      id: c.id,
      kind: c.kind,
      pos: c.box.getCenter(new Vector3()),
      size: (c.box.max.x - c.box.min.x) / 2,
    }));
  };

  const loop = new GameLoop({
    update: (dt) => {
      session?.update(dt);
      shatter.update(dt);
      if (session) {
        scene.sync(renderItems());
        hud.update(session.state, session.built.level, session.built.rooms.length);
        if (session.state.status !== "playing") endRun();
      }
    },
    render: () => scene.render(),
  });

  const menus = new Menus(app, save, {
    onStart: (levelId, mode) => startLevel(levelId, mode),
    onResume: () => {
      menus.hide();
      loop.resume();
    },
    onRetry: () => {
      if (session) startLevel(session.built.level.id, session.state.mode);
    },
    onMenu: () => {
      session = null;
      menus.showMain();
      loop.pause();
    },
  });

  function startLevel(levelId: number, mode: Mode): void {
    audio.unlock();
    const level = LEVELS.find((l) => l.id === levelId)!;
    const theme = ROOMS[0].theme;
    scene.setTheme(theme);
    audio.playMusic(theme);
    session = new Session(level, ROOMS, mode, scene.camera, Date.now() & 0xffff, {
      onShatter: (kind, at) => {
        shatter.burst(at, kind === "crystal" ? 0x7ffcd9 : 0x4fb3a3);
        audio.playSfx(kind === "crystal" ? "shatterCrystal" : "shatterGlass");
      },
    });
    menus.hide();
    loop.resume();
    if (!loop.running) loop.start();
  }

  function endRun(): void {
    if (!session) return;
    const completed = session.state.status === "complete";
    save = recordScore(save, session.built.level.id, session.state.score);
    saveSave(save);
    loop.pause();
    menus.showResults({
      score: session.state.score,
      best: save.bestScores[session.built.level.id] ?? session.state.score,
      completed,
    });
  }

  input.onThrow((p) => {
    if (session && session.state.status === "playing") {
      audio.playSfx("throw");
      session.throwBall(p);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) loop.pause();
  });

  menus.showMain();
  loop.start();
  loop.pause();
}
