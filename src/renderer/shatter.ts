import {
  InstancedMesh,
  BufferGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Scene,
  Vector3,
  Object3D,
  Color,
  DoubleSide,
} from "three";

const MAX_SHARDS = 240;
const PER_BURST = 16;
const LIFETIME = 1.1;
const GRAVITY = -14;
const HIDDEN_Y = -100000;

/** Cosmetic glass-shard burst: a pooled InstancedMesh of small triangles that
 *  fly out, tumble, fall under gravity, and retire. No persistent bodies. */
export class ShatterField {
  private mesh: InstancedMesh;
  private pos = new Float32Array(MAX_SHARDS * 3);
  private vel = new Float32Array(MAX_SHARDS * 3);
  private rot = new Float32Array(MAX_SHARDS * 3);
  private rotVel = new Float32Array(MAX_SHARDS * 3);
  private ages = new Float32Array(MAX_SHARDS).fill(LIFETIME + 1);
  private dummy = new Object3D();
  private scratch = new Color();
  private nextSlot = 0;

  constructor(scene: Scene) {
    const geo = new BufferGeometry();
    // a small, slightly irregular triangular shard
    geo.setAttribute(
      "position",
      new Float32BufferAttribute([0.0, 0.2, 0.0, -0.17, -0.13, 0.0, 0.15, -0.11, 0.0], 3),
    );
    geo.computeVertexNormals();
    const mat = new MeshStandardMaterial({
      transparent: true,
      opacity: 0.92,
      metalness: 0.25,
      roughness: 0.08,
      side: DoubleSide,
    });
    this.mesh = new InstancedMesh(geo, mat, MAX_SHARDS);
    this.mesh.frustumCulled = false;
    // Pre-initialize instanceColor so setColorAt type-checks in older three builds
    this.mesh.setColorAt(0, this.scratch);
    for (let i = 0; i < MAX_SHARDS; i++) this.hide(i);
    this.mesh.instanceMatrix.needsUpdate = true;
    scene.add(this.mesh);
  }

  private hide(i: number): void {
    this.dummy.position.set(0, HIDDEN_Y, 0);
    this.dummy.scale.set(0, 0, 0);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(i, this.dummy.matrix);
  }

  burst(at: Vector3, color: number): void {
    this.scratch.setHex(color);
    for (let n = 0; n < PER_BURST; n++) {
      const i = this.nextSlot;
      this.nextSlot = (this.nextSlot + 1) % MAX_SHARDS;
      this.ages[i] = 0;
      this.pos[i * 3] = at.x;
      this.pos[i * 3 + 1] = at.y;
      this.pos[i * 3 + 2] = at.z;
      this.vel[i * 3] = (Math.random() - 0.5) * 7;
      this.vel[i * 3 + 1] = Math.random() * 5 + 1;
      this.vel[i * 3 + 2] = (Math.random() - 0.5) * 7;
      this.rot[i * 3] = Math.random() * 6.28;
      this.rot[i * 3 + 1] = Math.random() * 6.28;
      this.rot[i * 3 + 2] = Math.random() * 6.28;
      this.rotVel[i * 3] = (Math.random() - 0.5) * 12;
      this.rotVel[i * 3 + 1] = (Math.random() - 0.5) * 12;
      this.rotVel[i * 3 + 2] = (Math.random() - 0.5) * 12;
      this.mesh.setColorAt(i, this.scratch);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    for (let i = 0; i < MAX_SHARDS; i++) {
      if (this.ages[i] > LIFETIME) continue;
      this.ages[i] += dt;
      if (this.ages[i] > LIFETIME) {
        this.hide(i);
        continue;
      }
      this.vel[i * 3 + 1] += GRAVITY * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.rot[i * 3] += this.rotVel[i * 3] * dt;
      this.rot[i * 3 + 1] += this.rotVel[i * 3 + 1] * dt;
      this.rot[i * 3 + 2] += this.rotVel[i * 3 + 2] * dt;
      const s = 0.5 + 0.5 * Math.max(0, 1 - this.ages[i] / LIFETIME);
      this.dummy.position.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      this.dummy.rotation.set(this.rot[i * 3], this.rot[i * 3 + 1], this.rot[i * 3 + 2]);
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
