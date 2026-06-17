import { PerspectiveCamera, Vector3 } from "three";
import type { Ball } from "../engine/physics";

export interface ScreenPoint {
  nx: number; // normalized device X in [-1, 1]
  ny: number; // normalized device Y in [-1, 1]
}

export function createThrow(
  id: number,
  point: ScreenPoint,
  camera: PerspectiveCamera,
  speed: number,
): Ball {
  const target = new Vector3(point.nx, point.ny, 0.5).unproject(camera);
  const origin = camera.position.clone();
  const vel = target.sub(origin).normalize().multiplyScalar(speed);
  return { id, pos: origin, vel, alive: true };
}
