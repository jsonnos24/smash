import { Box3, PerspectiveCamera, Vector3 } from "three";
import { createRunState, type Mode, type RunState } from "./state";
import { applyObstacleHit, applyCrystalHit, applyMiss, applyCrash } from "./economy";
import { createThrow, type ScreenPoint } from "./throw";
import { stepBall, detectHit, type Ball, type Collider } from "../engine/physics";
import { makeRng, pickRoom } from "../generator/levelBuilder";
import { difficultyAt, speedAt, START_BALLS, CHECKPOINT_SPACING, LOOKAHEAD } from "../content/endless";
import type { RoomTemplate } from "../content/rooms";

const BASE_SPEED = 9;
const THROW_SPEED = 45;
const ACTIVE_NEAR = 5;
const ACTIVE_FAR = -60;

export interface SessionEvents {
  onShatter?: (kind: "obstacle" | "crystal", at: Vector3) => void;
  onCrash?: () => void;
  onCheckpoint?: (distance: number) => void;
  onRespawn?: () => void;
}

interface WorldEntity {
  id: number;
  kind: "obstacle" | "crystal";
  baseZ: number;
  x: number;
  y: number;
  size: number;
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
          consumed: false,
        });
      }
      this.frontZ += tmpl.length;
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
      });
    }
    return out;
  }

  throwBall(p: ScreenPoint): void {
    if (this._state.balls <= 0) return;
    const balls =
      this._state.mode === "casual" ? Math.max(1, this._state.balls - 1) : this._state.balls - 1;
    this._state = { ...this._state, balls };
    this.balls.push(createThrow(this.nextId++, p, this.camera, THROW_SPEED));
  }

  update(dt: number): void {
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
        this.events.onShatter?.(e.kind, new Vector3(e.x, e.y, this.worldZ(e.baseZ)));
        this.events.onCrash?.();
      }
    }

    const cp = Math.floor(newDistance / CHECKPOINT_SPACING) * CHECKPOINT_SPACING;
    if (cp > this._checkpoint) {
      this._checkpoint = cp;
      this.events.onCheckpoint?.(cp);
    }

    if (this._state.mode === "normal" && this._state.balls <= 0) this.respawn();
  }

  private respawn(): void {
    this._state = {
      ...this._state,
      distance: this._checkpoint,
      balls: START_BALLS,
      status: "playing",
      hitChain: 0,
      streak: 1,
    };
    this.balls = [];
    for (const e of this.entities) {
      if (e.baseZ >= this._checkpoint) e.consumed = false;
    }
    this.events.onRespawn?.();
  }

  private resolveHit(collider: Collider): void {
    const e = this.entities.find((x) => x.id === collider.id);
    if (!e || e.consumed) return;
    e.consumed = true;
    const at = new Vector3(e.x, e.y, this.worldZ(e.baseZ));
    if (collider.kind === "obstacle") this._state = applyObstacleHit(this._state);
    else this._state = applyCrystalHit(this._state);
    this.events.onShatter?.(collider.kind, at);
  }
}
