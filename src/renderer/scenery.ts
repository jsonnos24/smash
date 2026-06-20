import {
  Scene, Group, Mesh, MeshStandardMaterial,
  ConeGeometry, BoxGeometry, SphereGeometry, BufferGeometry,
  Float32BufferAttribute, Color,
} from "three";
import { THEME_COLORS } from "./themes";
import type { Theme } from "../content/types";

// Corridor floor y – must stay in sync with scene.ts constant
const FLOOR_Y = -2.4;

// ─── helpers ──────────────────────────────────────────────────────────────────

function disposeMeshes(group: Group): void {
  group.traverse((obj) => {
    const mesh = obj as Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        (mesh.material as MeshStandardMaterial).dispose();
      }
    }
  });
}

/** Build a flat low-poly jagged ridge silhouette centred at (cx, baseY, cz).
 *  Returns a Mesh whose geometry is a triangle fan made from random peaks.
 *  We use BufferGeometry directly so it stays flat/2-D and featureless –
 *  all triangles face forward (no normals needed; material is unlit/dark). */
function buildRidge(
  cx: number,
  baseY: number,
  cz: number,
  width: number,
  maxHeight: number,
  peaks: number,
  color: number,
  opacity: number,
): Mesh {
  // Generate peak x-positions spread across width
  const verts: number[] = [];
  const dx = width / (peaks - 1);
  const peakHeights: number[] = [];
  for (let i = 0; i < peaks; i++) {
    // vary height — edges shorter, middle taller
    const t = i / (peaks - 1);
    const h = maxHeight * (0.4 + 0.6 * Math.sin(t * Math.PI)) * (0.6 + 0.4 * Math.random());
    peakHeights.push(h);
  }

  // Triangle strip between base and jagged peaks
  for (let i = 0; i < peaks - 1; i++) {
    const x0 = cx - width / 2 + i * dx;
    const x1 = cx - width / 2 + (i + 1) * dx;
    const y0 = baseY;
    const p0 = baseY + peakHeights[i];
    const p1 = baseY + peakHeights[i + 1];
    // Two triangles per column
    verts.push(x0, y0, cz,  x0, p0, cz,  x1, p1, cz);
    verts.push(x0, y0, cz,  x1, p1, cz,  x1, y0, cz);
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(new Float32Array(verts), 3));
  geo.computeVertexNormals();
  const mat = new MeshStandardMaterial({
    color,
    emissive: new Color(color).multiplyScalar(0.08),
    transparent: true,
    opacity,
    roughness: 1,
    metalness: 0,
    depthWrite: false,
  });
  return new Mesh(geo, mat);
}

// ─── Scenery class ─────────────────────────────────────────────────────────────

export class Scenery {
  private backdropGroup = new Group();
  private scrollMeshes: { mesh: Mesh; baseZ: number; period: number; factor: number }[] = [];

  constructor(scene: Scene) {
    scene.add(this.backdropGroup);
  }

  setTheme(theme: Theme): void {
    // Dispose previous content
    disposeMeshes(this.backdropGroup);
    this.backdropGroup.clear();
    this.scrollMeshes = [];

    if (theme === "crystalCavern") this.buildCrystalCavern();
    else if (theme === "neonTunnel") this.buildNeonTunnel();
    else if (theme === "glassChapel") this.buildGlassChapel();
  }

  update(distance: number): void {
    for (const entry of this.scrollMeshes) {
      const { mesh, baseZ, period, factor } = entry;
      // Elements move toward +z (toward camera) and wrap via modulo.
      // baseZ encodes per-element stagger so they tile evenly.
      const z = ((distance * factor + baseZ) % period) - period;
      mesh.position.z = z;
    }
  }

  dispose(): void {
    disposeMeshes(this.backdropGroup);
    this.backdropGroup.clear();
    this.scrollMeshes = [];
  }

  // ── crystalCavern: distant mountain ridges, left and right ─────────────────

  private buildCrystalCavern(): void {
    const fog = THEME_COLORS.crystalCavern.fog;
    // Tint slightly toward fog: very dark teal-black
    const ridgeColor = blendColors(fog, 0x000000, 0.55);
    const FACTOR = 0.15;
    const PERIOD = 120;

    // 3 ridges on the left, 3 on the right, staggered in z
    const configs: { x: number; baseOffset: number; width: number; maxH: number }[] = [
      { x: -14, baseOffset: 0,  width: 22, maxH: 12 },
      { x: -14, baseOffset: 40, width: 20, maxH:  9 },
      { x: -14, baseOffset: 80, width: 18, maxH: 10 },
      { x:  14, baseOffset: 20, width: 22, maxH: 11 },
      { x:  14, baseOffset: 60, width: 20, maxH:  8 },
      { x:  14, baseOffset: 100,width: 18, maxH: 13 },
    ];

    for (const cfg of configs) {
      const mesh = buildRidge(cfg.x, FLOOR_Y, 0, cfg.width, cfg.maxH, 9, ridgeColor, 0.82);
      this.backdropGroup.add(mesh);
      // Store scroll params; baseZ = cfg.baseOffset encodes stagger
      this.scrollMeshes.push({ mesh, baseZ: cfg.baseOffset, period: PERIOD, factor: FACTOR });
    }
  }

  // ── neonTunnel: large volcano left + smaller cone right ────────────────────

  private buildNeonTunnel(): void {
    const fog = THEME_COLORS.neonTunnel.fog;
    const darkPurple = blendColors(fog, 0x000000, 0.5);
    const FACTOR = 0.2;
    const PERIOD = 120;

    // Main volcano (left)
    const volcanoH = 14;
    const volcanoR = 4;
    const craterBaseY = FLOOR_Y + volcanoH * 0.78;

    const volcanoGeo = new ConeGeometry(volcanoR, volcanoH, 7, 1);
    const volcanoMat = new MeshStandardMaterial({
      color: darkPurple,
      emissive: new Color(darkPurple).multiplyScalar(0.05),
      roughness: 1,
      metalness: 0,
    });
    const volcano = new Mesh(volcanoGeo, volcanoMat);
    volcano.position.set(-13, FLOOR_Y + volcanoH / 2, 0);
    this.backdropGroup.add(volcano);
    this.scrollMeshes.push({ mesh: volcano, baseZ: 0, period: PERIOD, factor: FACTOR });

    // Glowing crater (small emissive cone on top of the volcano)
    const craterGeo = new ConeGeometry(1.1, 2.2, 6, 1);
    const craterMat = new MeshStandardMaterial({
      color: 0xff4500,
      emissive: 0xff2200,
      emissiveIntensity: 1.8,
      roughness: 0.6,
      metalness: 0,
    });
    const crater = new Mesh(craterGeo, craterMat);
    crater.position.set(-13, craterBaseY, 0);
    this.backdropGroup.add(crater);
    this.scrollMeshes.push({ mesh: crater, baseZ: 0, period: PERIOD, factor: FACTOR });

    // Smaller distant cone right side
    const smallH = 8;
    const smallGeo = new ConeGeometry(2.5, smallH, 6, 1);
    const smallMat = new MeshStandardMaterial({
      color: darkPurple,
      roughness: 1,
      metalness: 0,
    });
    const smallCone = new Mesh(smallGeo, smallMat);
    smallCone.position.set(15, FLOOR_Y + smallH / 2, 0);
    this.backdropGroup.add(smallCone);
    this.scrollMeshes.push({ mesh: smallCone, baseZ: 60, period: PERIOD, factor: FACTOR });
  }

  // ── glassChapel: hotel doorways scrolling past both sides ──────────────────

  private buildGlassChapel(): void {
    const DOOR_W = 1.6; // width ALONG the hallway (z)
    const DOOR_H = 3.0; // height (y)
    const DOOR_T = 0.14; // thickness into the wall (x)
    const SPACING = 6;
    const NUM_DOORS = 12; // 6 per side
    const PERIOD = (NUM_DOORS / 2) * SPACING; // 36
    const FACTOR = 1.0;

    const doorMat = () =>
      new MeshStandardMaterial({
        color: 0x6e4a2c, // brown
        emissive: 0x1a0f06,
        roughness: 0.85,
        metalness: 0.05,
      });
    const knobMat = () =>
      new MeshStandardMaterial({
        color: 0xffd633, // yellow doorknob
        emissive: 0x6b5200,
        emissiveIntensity: 0.6,
        roughness: 0.4,
        metalness: 0.4,
      });

    const sides = [
      { x: -7.2, startOffset: 0 },
      { x: 7.2, startOffset: SPACING / 2 }, // stagger right side by half-spacing
    ];

    for (const side of sides) {
      // Inner face points toward the corridor centre.
      const innerSign = side.x < 0 ? 1 : -1;
      for (let i = 0; i < NUM_DOORS / 2; i++) {
        // Door lies flat on the side wall: thin in X, tall in Y, wide in Z.
        const geo = new BoxGeometry(DOOR_T, DOOR_H, DOOR_W);
        const door = new Mesh(geo, doorMat());
        door.position.set(side.x, FLOOR_Y + DOOR_H / 2, 0);
        // Yellow knob on the inner face, near the front edge, around handle height.
        const knob = new Mesh(new SphereGeometry(0.12, 10, 10), knobMat());
        knob.position.set(innerSign * (DOOR_T / 2 + 0.06), -0.4, DOOR_W * 0.34);
        door.add(knob);
        this.backdropGroup.add(door);
        const baseZ = i * SPACING + side.startOffset;
        this.scrollMeshes.push({ mesh: door, baseZ, period: PERIOD, factor: FACTOR });
      }
    }
  }
}

// ─── utility ──────────────────────────────────────────────────────────────────

/** Linear blend between two hex colours: t=0 → a, t=1 → b */
function blendColors(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return (rr << 16) | (rg << 8) | rb;
}
