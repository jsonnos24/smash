import { Vector3, Box3, Ray } from "three";

export const GRAVITY = -9.8;

export interface Ball {
  id: number;
  pos: Vector3;
  vel: Vector3;
  alive: boolean;
}

export interface Collider {
  id: number;
  kind: "obstacle" | "crystal";
  box: Box3;
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
