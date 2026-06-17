import {
  Points, BufferGeometry, Float32BufferAttribute, PointsMaterial, Scene, Vector3,
} from "three";

const MAX_PARTICLES = 600;
const LIFETIME = 0.6;

export class ShatterField {
  private positions = new Float32Array(MAX_PARTICLES * 3);
  private velocities = new Float32Array(MAX_PARTICLES * 3);
  private ages = new Float32Array(MAX_PARTICLES).fill(LIFETIME + 1);
  private geom = new BufferGeometry();
  private points: Points;

  constructor(scene: Scene) {
    this.geom.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    this.points = new Points(this.geom, new PointsMaterial({ size: 0.15, transparent: true, opacity: 0.9 }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  burst(at: Vector3, color: number): void {
    (this.points.material as PointsMaterial).color.setHex(color);
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < 24; i++) {
      if (this.ages[i] <= LIFETIME) continue;
      this.ages[i] = 0;
      this.positions[i * 3] = at.x;
      this.positions[i * 3 + 1] = at.y;
      this.positions[i * 3 + 2] = at.z;
      this.velocities[i * 3] = (Math.random() - 0.5) * 6;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 6;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 6;
      spawned++;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.ages[i] > LIFETIME) continue;
      this.ages[i] += dt;
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
    }
    (this.geom.getAttribute("position") as Float32BufferAttribute).copyArray(this.positions);
    this.geom.getAttribute("position").needsUpdate = true;
  }
}
