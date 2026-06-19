import { Box3, PerspectiveCamera, Vector3 } from "three";
import { createRunState, type Mode, type RunState } from "./state";
import { applyObstacleHit, applyCrystalHit, applyMiss, applyCrash } from "./economy";
import { createThrow, type ScreenPoint } from "./throw";
import { stepBall, detectHit, type Ball, type Collider } from "../engine/physics";
import { buildLevel, makeRng, type BuiltLevel } from "../generator/levelBuilder";
import type { LevelDef } from "../content/types";
import type { RoomTemplate } from "../content/rooms";

const BASE_SPEED = 9; // meters/sec at level.speed = 1 (L1=9, L6≈12.4)
const THROW_SPEED = 45;
const ACTIVE_NEAR = 5;
const ACTIVE_FAR = -60;

export interface SessionEvents {
  onShatter?: (kind: "obstacle" | "crystal", at: Vector3) => void;
  onCrash?: () => void;
}

interface WorldEntity {
  id: number;
  kind: "obstacle" | "crystal";
  baseZ: number; // room.startZ + entity.z
  x: number;
  y: number;
  size: number;
  consumed: boolean;
}

export class Session {
  private _state: RunState;
  private _built: BuiltLevel;
  private entities: WorldEntity[];
  private balls: Ball[] = [];
  private nextId = 1;

  constructor(
    level: LevelDef,
    rooms: RoomTemplate[],
    mode: Mode,
    private camera: PerspectiveCamera,
    seed: number,
    private events: SessionEvents = {},
  ) {
    this._built = buildLevel(level, rooms, makeRng(seed));
    this._state = createRunState(mode, level.startBalls);
    let eid = 1;
    this.entities = this._built.rooms.flatMap((pr) =>
      pr.template.entities.map((e) => ({
        id: eid++,
        kind: e.kind,
        baseZ: pr.startZ + e.z,
        x: e.x,
        y: e.y,
        size: e.size,
        consumed: false,
      })),
    );
  }

  get state(): RunState {
    return this._state;
  }
  get built(): BuiltLevel {
    return this._built;
  }
  /** Live thrown balls, exposed read-only so the renderer can draw them. */
  get liveBalls(): readonly Ball[] {
    return this.balls;
  }

  private worldZ(baseZ: number): number {
    return this._state.distance - baseZ; // negative = ahead, approaches 0
  }

  private roomIndexAt(distance: number): number {
    const rooms = this._built.rooms;
    let idx = 0;
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].startZ <= distance) idx = i;
      else break;
    }
    return idx;
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
        box: new Box3(
          new Vector3(e.x - h, e.y - h, z - h),
          new Vector3(e.x + h, e.y + h, z + h),
        ),
      });
    }
    return out;
  }

  throwBall(p: ScreenPoint): void {
    if (this._state.status !== "playing") return;
    this.balls.push(createThrow(this.nextId++, p, this.camera, THROW_SPEED));
  }

  update(dt: number): void {
    if (this._state.status !== "playing") return;

    // advance world
    const newDistance = this._state.distance + BASE_SPEED * this.level().speed * dt;
    this._state = { ...this._state, distance: newDistance, roomIndex: this.roomIndexAt(newDistance) };

    // step balls and resolve hits
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
        // flew past the player or fell out: a miss
        this._state = applyMiss(this._state);
        ball.alive = false;
      }
      if (ball.alive) surviving.push(ball);
    }
    this.balls = surviving;

    // Anything unbroken that reaches the player is a crash: costs a ball.
    for (const e of this.entities) {
      if (e.consumed) continue;
      if (this.worldZ(e.baseZ) >= 0) {
        e.consumed = true;
        this._state = applyCrash(this._state);
        this.events.onShatter?.(e.kind, new Vector3(e.x, e.y, this.worldZ(e.baseZ)));
        this.events.onCrash?.();
        if (this._state.status !== "playing") break;
      }
    }

    // complete the level
    if (this._state.distance >= this._built.totalLength) {
      this._state = { ...this._state, status: "complete" };
    }
  }

  private resolveHit(collider: Collider): void {
    const e = this.entities.find((x) => x.id === collider.id);
    if (!e || e.consumed) return;
    e.consumed = true;
    const at = new Vector3(e.x, e.y, this.worldZ(e.baseZ));
    if (collider.kind === "obstacle") {
      this._state = applyObstacleHit(this._state, this.level());
    } else {
      this._state = applyCrystalHit(this._state, this.level());
    }
    this.events.onShatter?.(collider.kind, at);
  }

  private level(): LevelDef {
    return this._built.level;
  }
}
