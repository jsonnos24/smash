import { Box3, PerspectiveCamera, Vector3 } from "three";
import { createRunState, type Mode, type RunState } from "./state";
import { applyObstacleHit, applyCrystalHit, applyMiss, applyCrash, applyDoorHit } from "./economy";
import { createThrow, type ScreenPoint } from "./throw";
import { stepBall, detectHit, type Ball, type Collider } from "../engine/physics";
import { makeRng, pickRoom } from "../generator/levelBuilder";
import { difficultyAt, speedAt, START_BALLS, MAX_BALLS, CHECKPOINT_SPACING, LOOKAHEAD, DOOR_HITS, GATE_GAP } from "../content/endless";
import type { RoomTemplate } from "../content/rooms";

const BASE_SPEED = 9;
const THROW_SPEED = 45;
const ACTIVE_NEAR = 5;
const ACTIVE_FAR = -60;

export interface SessionEvents {
  onShatter?: (kind: "obstacle" | "crystal" | "door", at: Vector3) => void;
  onCrash?: () => void;
  onCheckpoint?: (distance: number) => void;
}

interface WorldEntity {
  id: number;
  kind: "obstacle" | "crystal" | "door";
  baseZ: number;
  x: number;
  y: number;
  size: number;
  hits: number;
  consumed: boolean;
}

export class Session {
  private _state: RunState;
  private entities: WorldEntity[] = [];
  private balls: Ball[] = [];
  private nextId = 1;
  private nextEntityId = 1;
  private frontZ = 0;
  private rng: () => number;
  private _checkpoint = 0;

  constructor(
    private rooms: RoomTemplate[],
    mode: Mode,
    private camera: PerspectiveCamera,
    seed: number,
    private events: SessionEvents = {},
  ) {
    this.rng = makeRng(seed);
    this._state = createRunState(mode, START_BALLS);
    this.generateAhead();
  }

  get state(): RunState {
    return this._state;
  }
  get liveBalls(): readonly Ball[] {
    return this.balls;
  }
  get checkpoint(): number {
    return this._checkpoint;
  }

  private worldZ(baseZ: number): number {
    return this._state.distance - baseZ;
  }

  private pushGate(z: number): void {
    for (const dx of [-1.1, 1.1]) {
      this.entities.push({
        id: this.nextEntityId++,
        kind: "door",
        baseZ: z,
        x: dx,
        y: 1.2,
        size: 1.3,
        hits: DOOR_HITS,
        consumed: false,
      });
    }
  }

  private generateAhead(): void {
    while (this.frontZ < this._state.distance + LOOKAHEAD) {
      const tmpl = pickRoom(this.rooms, difficultyAt(this.frontZ), this.rng);
      for (const e of tmpl.entities) {
        this.entities.push({
          id: this.nextEntityId++,
          kind: e.kind,
          baseZ: this.frontZ + e.z,
          x: e.x,
          y: e.y,
          size: e.size,
          hits: 1,
          consumed: false,
        });
      }
      this.frontZ += tmpl.length;
      this.pushGate(this.frontZ);
      this.frontZ += GATE_GAP;
    }
  }

  colliders(): Collider[] {
    const out: Collider[] = [];
    for (const e of this.entities) {
      if (e.consumed) continue;
      const z = this.worldZ(e.baseZ);
      if (z < ACTIVE_FAR || z > ACTIVE_NEAR) continue;
      const h = e.size;
      out.push({
        id: e.id,
        kind: e.kind,
        box: new Box3(new Vector3(e.x - h, e.y - h, z - h), new Vector3(e.x + h, e.y + h, z + h)),
        damaged: e.kind === "door" && e.hits < DOOR_HITS,
      });
    }
    return out;
  }

  throwBall(p: ScreenPoint): void {
    if (this._state.status !== "playing") return;
    if (this._state.balls <= 0) return;
    const balls =
      this._state.mode === "casual" ? Math.max(1, this._state.balls - 1) : this._state.balls - 1;
    const status =
      this._state.mode === "normal" && balls <= 0 ? "ended" : this._state.status;
    this._state = { ...this._state, balls, status };
    this.balls.push(createThrow(this.nextId++, p, this.camera, THROW_SPEED));
  }

  update(dt: number): void {
    if (this._state.status !== "playing") return;
    const newDistance = this._state.distance + BASE_SPEED * speedAt(this._state.distance) * dt;
    this._state = { ...this._state, distance: newDistance };
    this.generateAhead();
    this.entities = this.entities.filter((e) => e.baseZ >= newDistance - 30);

    const colliders = this.colliders();
    const surviving: Ball[] = [];
    for (const ball of this.balls) {
      const prev = ball.pos.clone();
      stepBall(ball, dt);
      const hit = detectHit(prev, ball, colliders);
      if (hit) {
        this.resolveHit(hit.collider);
        ball.alive = false;
      } else if (ball.pos.z > 5 || ball.pos.y < -5) {
        this._state = applyMiss(this._state);
        ball.alive = false;
      }
      if (ball.alive) surviving.push(ball);
    }
    this.balls = surviving;

    for (const e of this.entities) {
      if (e.consumed) continue;
      if (this.worldZ(e.baseZ) >= 0) {
        e.consumed = true;
        this._state = applyCrash(this._state);
        this.events.onShatter?.(e.kind === "crystal" ? "crystal" : "obstacle", new Vector3(e.x, e.y, this.worldZ(e.baseZ)));
        this.events.onCrash?.();
      }
    }

    const cp = Math.floor(newDistance / CHECKPOINT_SPACING) * CHECKPOINT_SPACING;
    if (cp > this._checkpoint) {
      this._checkpoint = cp;
      this._state = { ...this._state, balls: Math.min(MAX_BALLS, this._state.balls + 3) };
      this.events.onCheckpoint?.(cp);
    }

  }

  private resolveHit(collider: Collider): void {
    const e = this.entities.find((x) => x.id === collider.id);
    if (!e || e.consumed) return;
    const at = new Vector3(e.x, e.y, this.worldZ(e.baseZ));
    if (e.kind === "door") {
      e.hits -= 1;
      const broke = e.hits <= 0;
      if (broke) e.consumed = true;
      this._state = applyDoorHit(this._state, broke);
      this.events.onShatter?.("obstacle", at);
      return;
    }
    e.consumed = true;
    if (collider.kind === "obstacle") this._state = applyObstacleHit(this._state);
    else this._state = applyCrystalHit(this._state);
    this.events.onShatter?.(collider.kind, at);
  }
}
