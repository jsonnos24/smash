import {
  Scene, PerspectiveCamera, Group, Mesh, BoxGeometry, SphereGeometry, OctahedronGeometry,
  MeshStandardMaterial, LineSegments, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, Vector3,
} from "three";
import type { WeaponId } from "../game/upgrades";

interface Fx {
  objs: (Mesh | LineSegments)[];
  age: number;
  life: number;
  tick: (objs: (Mesh | LineSegments)[], k: number) => void;
}

function disposeObj(o: Mesh | LineSegments): void {
  o.geometry.dispose();
  const m = o.material as MeshStandardMaterial | LineBasicMaterial;
  m.dispose();
  if (o.parent) o.parent.remove(o);
}

/** Per-weapon visual effects, attached to the camera so they bank with the view. */
export class WeaponFx {
  private group = new Group();
  private orbs: Mesh[] = [];
  private orbAngle = 0;
  private fx: Fx[] = [];

  constructor(scene: Scene, cam: PerspectiveCamera) {
    cam.add(this.group);
    if (!cam.parent) scene.add(cam); // ensure the camera (and its child effects) are in the graph
    for (let i = 0; i < 3; i++) {
      const orb = new Mesh(
        new SphereGeometry(0.35, 12, 12),
        new MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5500, emissiveIntensity: 1 }),
      );
      orb.visible = false;
      this.group.add(orb);
      this.orbs.push(orb);
    }
  }

  /** number of active transient effects (for tests). */
  get activeCount(): number {
    return this.fx.length;
  }

  setOwned(weapons: WeaponId[]): void {
    const ring = weapons.includes("ringFire");
    for (const o of this.orbs) o.visible = ring;
  }

  fire(weapon: WeaponId, targets: Vector3[]): void {
    this.group.updateWorldMatrix(true, false);
    const local = targets.map((t) => this.group.worldToLocal(t.clone()));
    switch (weapon) {
      case "sword": this.sword(); break;
      case "flameStick": this.ember(local); break;
      case "forceBlast": this.blast(); break;
      case "shock": this.shock(local); break;
      case "spikeBall": this.spike(); break;
      case "ringFire": break; // persistent orbs handled in update
    }
  }

  update(dt: number): void {
    if (this.orbs[0]?.visible) {
      this.orbAngle += dt * 3;
      const n = this.orbs.length;
      this.orbs.forEach((o, i) => {
        const a = this.orbAngle + (i * Math.PI * 2) / n;
        o.position.set(Math.cos(a) * 2.3, Math.sin(a) * 2.3, -2.6);
      });
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.age += dt;
      const k = f.age / f.life;
      if (k >= 1) {
        f.objs.forEach(disposeObj);
        this.fx.splice(i, 1);
        continue;
      }
      f.tick(f.objs, k);
    }
  }

  private add(objs: (Mesh | LineSegments)[], life: number, tick: Fx["tick"]): void {
    for (const o of objs) this.group.add(o);
    this.fx.push({ objs, age: 0, life, tick });
  }

  private sword(): void {
    const blade = new Mesh(
      new BoxGeometry(0.16, 3.4, 0.16),
      new MeshStandardMaterial({ color: 0xcfe8ff, emissive: 0x88bbff, emissiveIntensity: 0.9, transparent: true }),
    );
    blade.position.set(0, 0, -3);
    this.add([blade], 0.28, (o, k) => {
      o[0].rotation.z = -1.3 + k * 2.6;
      (o[0].material as MeshStandardMaterial).opacity = 1 - k;
    });
  }

  private blast(): void {
    const ball = new Mesh(
      new SphereGeometry(0.6, 16, 16),
      new MeshStandardMaterial({ color: 0x8ff0ff, emissive: 0x33e0ff, emissiveIntensity: 1, transparent: true }),
    );
    ball.position.set(0, 0, -2);
    this.add([ball], 0.5, (o, k) => {
      o[0].position.z = -2 - k * 55;
      o[0].scale.setScalar(1 + k * 0.8);
      (o[0].material as MeshStandardMaterial).opacity = 1 - k * 0.6;
    });
  }

  private ember(local: Vector3[]): void {
    for (const t of local) {
      const puff = new Mesh(
        new SphereGeometry(0.4, 10, 10),
        new MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5500, emissiveIntensity: 1, transparent: true }),
      );
      puff.position.copy(t);
      this.add([puff], 0.45, (o, k) => {
        o[0].scale.setScalar(0.5 + k * 2);
        (o[0].material as MeshStandardMaterial).opacity = 1 - k;
      });
    }
  }

  private shock(local: Vector3[]): void {
    for (const t of local) {
      const from = new Vector3(0, 0, -0.5);
      const pts: number[] = [];
      const SEG = 6;
      let prev = from.clone();
      for (let i = 1; i <= SEG; i++) {
        const f = i / SEG;
        const p = from.clone().lerp(t, f);
        if (i < SEG) { p.x += (Math.random() - 0.5) * 0.7; p.y += (Math.random() - 0.5) * 0.7; }
        pts.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        prev = p;
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new Float32BufferAttribute(pts, 3));
      const line = new LineSegments(g, new LineBasicMaterial({ color: 0x9fdcff, transparent: true }));
      this.add([line], 0.22, (o, k) => {
        (o[0].material as LineBasicMaterial).opacity = 1 - k;
      });
    }
  }

  private spike(): void {
    const ball = new Mesh(
      new OctahedronGeometry(0.7),
      new MeshStandardMaterial({ color: 0x999999, emissive: 0x330808, metalness: 0.8, roughness: 0.3 }),
    );
    const chain = new LineSegments(
      new BufferGeometry().setAttribute("position", new Float32BufferAttribute([0, 0, -0.5, 0, 0, -2], 3)),
      new LineBasicMaterial({ color: 0xbbbbbb }),
    );
    this.add([ball, chain], 0.8, (o, k) => {
      const z = -2 - Math.sin(Math.min(1, k) * Math.PI) * 55; // out then snap back (tape-measure)
      o[0].position.set(0, 0, z);
      o[0].rotation.x += 0.4;
      o[0].rotation.y += 0.3;
      const cg = (o[1] as LineSegments).geometry as BufferGeometry;
      (cg.getAttribute("position") as Float32BufferAttribute).copyArray([0, 0, -0.5, 0, 0, z]);
      cg.getAttribute("position").needsUpdate = true;
    });
  }

  dispose(): void {
    for (const f of this.fx) f.objs.forEach(disposeObj);
    this.fx = [];
    for (const o of this.orbs) disposeObj(o);
    this.orbs = [];
  }
}
