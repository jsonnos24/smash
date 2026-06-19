import { Vector3, Box3, Ray } from "three";

export const GRAVITY = -9.8;

export interface Ball {
  id: number;
  pos: Vector3;
  vel: Vector3;
  alive: boolean;
  bounce?: boolean;
}

export interface Collider {
  id: number;
  kind: "obstacle" | "crystal" | "door" | "powerup";
  box: Box3;
  damaged?: boolean;
  spin?: number;
}

/** Reflect a ball off the corridor walls/ceiling/floor (for multiball). */
export function reflectBounds(ball: Ball, halfWidth: number, floorY: number, ceilY: number): void {
  if (ball.pos.x > halfWidth) { ball.pos.x = halfWidth; ball.vel.x = -Math.abs(ball.vel.x); }
  else if (ball.pos.x < -halfWidth) { ball.pos.x = -halfWidth; ball.vel.x = Math.abs(ball.vel.x); }
  if (ball.pos.y > ceilY) { ball.pos.y = ceilY; ball.vel.y = -Math.abs(ball.vel.y); }
  else if (ball.pos.y < floorY) { ball.pos.y = floorY; ball.vel.y = Math.abs(ball.vel.y); }
}

export function stepBall(ball: Ball, dt: number): void {
  ball.vel.y += GRAVITY * dt;
  ball.pos.addScaledVector(ball.vel, dt);
}

export interface Hit {
  ballId: number;
  collider: Collider;
}

export function detectHit(
  prevPos: Vector3,
  ball: Ball,
  colliders: Collider[],
): Hit | null {
  const dir = new Vector3().subVectors(ball.pos, prevPos);
  const segLen = dir.length();
  if (segLen === 0) return null;
  dir.normalize();
  const ray = new Ray(prevPos.clone(), dir);
  const target = new Vector3();

  let nearest: Collider | null = null;
  let nearestDist = Infinity;
  for (const c of colliders) {
    const point = ray.intersectBox(c.box, target);
    if (point) {
      const dist = point.distanceTo(prevPos);
      if (dist <= segLen && dist < nearestDist) {
        nearestDist = dist;
        nearest = c;
      }
    }
  }
  return nearest ? { ballId: ball.id, collider: nearest } : null;
}
