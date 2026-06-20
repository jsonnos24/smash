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
  private orbHalos: Mesh[] = [];
  private orbAngle = 0;
  private fx: Fx[] = [];

  constructor(scene: Scene, cam: PerspectiveCamera) {
    cam.add(this.group);
    if (!cam.parent) scene.add(cam); // ensure the camera (and its child effects) are in the graph
    for (let i = 0; i < 3; i++) {
      const orb = new Mesh(
        new SphereGeometry(0.45, 14, 14),
        new MeshStandardMaterial({ color: 0xffb060, emissive: 0xff5500, emissiveIntensity: 1.6 }),
      );
      const halo = new Mesh(
        new SphereGeometry(0.9, 14, 14),
        new MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5500, emissiveIntensity: 0.7, transparent: true, opacity: 0.3 }),
      );
      orb.visible = false;
      halo.visible = false;
      this.group.add(orb);
      this.group.add(halo);
      this.orbs.push(orb);
      this.orbHalos.push(halo);
    }
  }

  /** number of active transient effects (for tests). */
  get activeCount(): number {
    return this.fx.length;
  }

  setOwned(weapons: WeaponId[]): void {
    const ring = weapons.includes("ringFire");
    for (const o of this.orbs) o.visible = ring;
    for (const h of this.orbHalos) h.visible = ring;
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
      this.orbAngle += dt * 4;
      const n = this.orbs.length;
      this.orbs.forEach((o, i) => {
        const a = this.orbAngle + (i * Math.PI * 2) / n;
        o.position.set(Math.cos(a) * 2.4, Math.sin(a) * 2.4, -2.6);
        this.orbHalos[i].position.copy(o.position);
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
      new BoxGeometry(0.22, 4.0, 0.22),
      new MeshStandardMaterial({ color: 0xeaf4ff, emissive: 0xaaccff, emissiveIntensity: 1.4, transparent: true }),
    );
    blade.position.set(0, 0, -3);
    this.add([blade], 0.5, (o, k) => {
      o[0].rotation.z = -1.6 + k * 3.2;
      o[0].scale.setScalar(1 + k * 0.6);
      (o[0].material as MeshStandardMaterial).opacity = Math.max(0, 1 - k);
    });
  }

  private blast(): void {
    const core = new Mesh(
      new SphereGeometry(0.7, 16, 16),
      new MeshStandardMaterial({ color: 0xaff6ff, emissive: 0x44e6ff, emissiveIntensity: 1.6, transparent: true }),
    );
    const halo = new Mesh(
      new SphereGeometry(1.3, 16, 16),
      new MeshStandardMaterial({ color: 0x33e0ff, emissive: 0x33e0ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.35 }),
    );
    core.position.set(0, 0, -2);
    halo.position.set(0, 0, -2);
    this.add([core, halo], 0.85, (o, k) => {
      const z = -2 - k * 70;
      o[0].position.z = z;
      o[1].position.z = z;
      o[0].scale.setScalar(1 + k);
      o[1].scale.setScalar(1 + k * 1.6);
      (o[0].material as MeshStandardMaterial).opacity = Math.max(0, 1 - k * 0.7);
      (o[1].material as MeshStandardMaterial).opacity = Math.max(0, 0.35 * (1 - k));
    });
  }

  private ember(local: Vector3[]): void {
    for (const t of local) {
      const puff = new Mesh(
        new SphereGeometry(0.5, 10, 10),
        new MeshStandardMaterial({ color: 0xffa040, emissive: 0xff5500, emissiveIntensity: 1.5, transparent: true }),
      );
      puff.position.copy(t);
      const baseY = t.y;
      this.add([puff], 0.7, (o, k) => {
        o[0].scale.setScalar(0.5 + k * 3);
        o[0].position.y = baseY + k * 1.5;
        (o[0].material as MeshStandardMaterial).opacity = Math.max(0, 1 - k);
      });
    }
  }

  private shock(local: Vector3[]): void {
    const buildBolt = (from: Vector3, to: Vector3): LineSegments => {
      const pts: number[] = [];
      const SEG = 6;
      let prev = from.clone();
      for (let i = 1; i <= SEG; i++) {
        const f = i / SEG;
        const p = from.clone().lerp(to, f);
        if (i < SEG) { p.x += (Math.random() - 0.5) * 0.7; p.y += (Math.random() - 0.5) * 0.7; }
        pts.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        prev = p;
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new Float32BufferAttribute(pts, 3));
      return new LineSegments(g, new LineBasicMaterial({ color: 0xcfeaff, transparent: true }));
    };
    for (const t of local) {
      const from = new Vector3(0, 0, -0.5);
      const line1 = buildBolt(from, t);
      const line2 = buildBolt(from, t);
      this.add([line1, line2], 0.4, (o, k) => {
        (o[0].material as LineBasicMaterial).opacity = 1 - k;
        (o[1].material as LineBasicMaterial).opacity = 1 - k;
      });
    }
  }

  private spike(): void {
    const ball = new Mesh(
      new OctahedronGeometry(0.85),
      new MeshStandardMaterial({ color: 0xaaaaaa, emissive: 0x551111, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.3 }),
    );
    const chain = new LineSegments(
      new BufferGeometry().setAttribute("position", new Float32BufferAttribute([0, 0, -0.5, 0, 0, -2], 3)),
      new LineBasicMaterial({ color: 0xdddddd }),
    );
    this.add([ball, chain], 1.1, (o, k) => {
      const z = -2 - Math.sin(Math.min(1, k) * Math.PI) * 70;
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
    for (const h of this.orbHalos) disposeObj(h);
    this.orbHalos = [];
  }
}
