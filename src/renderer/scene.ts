import {
  Scene, PerspectiveCamera, WebGLRenderer, Fog, AmbientLight, DirectionalLight,
  Mesh, BoxGeometry, OctahedronGeometry, SphereGeometry, MeshStandardMaterial,
  Vector3, Color, LineSegments, BufferGeometry, Float32BufferAttribute, LineBasicMaterial,
} from "three";
import { THEME_COLORS } from "./themes";
import { Scenery } from "./scenery";
import type { Theme } from "../content/types";
import { pathOffsetX, pathOffsetY } from "../content/endless";

export interface RenderItem {
  id: number;
  kind: "obstacle" | "crystal" | "ball" | "door" | "powerup";
  pos: Vector3;
  size: number;
  damaged?: boolean;
  spin?: number;
}

// Corridor geometry constants
const W = 4.4;
const FLOOR_Y = -2.4;
const CEIL_Y = 5.6;
const NEAR_Z = 2;
const CORRIDOR_DEPTH = 96;
const SPACING = 8;
const RUNGS = CORRIDOR_DEPTH / SPACING; // 12
const EDGE_SEG_LEN = 4; // longitudinal tessellation step (units)
const EDGE_SEGS = CORRIDOR_DEPTH / EDGE_SEG_LEN; // 24 segments per long edge/line
const LONG = 6; // longitudinal floor lines across the width

export class SceneManager {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private meshes = new Map<number, Mesh>();
  private theme: Theme = "crystalCavern";

  private corridorEdgeMaterial!: LineBasicMaterial;
  private corridorRungMaterial!: LineBasicMaterial;
  private corridorRungGeom!: BufferGeometry;
  private corridorRungPositions!: Float32Array;
  private corridorEdgeGeom!: BufferGeometry;
  private corridorEdgePositions!: Float32Array;
  // Per-edge base X and Y (for 4 long edges): [baseX, baseY] for each
  private corridorEdgeBases!: Array<[number, number]>;
  private corridorFloorGeom!: BufferGeometry;
  private corridorFloorPositions!: Float32Array;
  private corridorFloorMaterial!: LineBasicMaterial;
  // X positions of each longitudinal floor line (LONG+1 lines)
  private corridorFloorLineX!: Float32Array;
  // Z positions of lateral floor lines (one per rung)
  private corridorFloorLateralZ!: Float32Array;
  private shakeT = 0;
  private scenery!: Scenery;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.camera = new PerspectiveCamera(72, 1, 0.1, 200);
    this.camera.position.set(0, 1, 0);
    this.camera.lookAt(new Vector3(0, 1, -10));
    this.scene.add(new AmbientLight(0xffffff, 0.6));
    const dir = new DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 5, 1);
    this.scene.add(dir);
    this.buildCorridor();
    this.scenery = new Scenery(this.scene);
    this.setTheme("crystalCavern");
  }

  /** Lateral offset of the corridor at corridor-local z (negative = ahead), given player distance d. */
  private curveX(d: number, z: number): number {
    return pathOffsetX(d - z) - pathOffsetX(d);
  }

  /** Vertical offset of the corridor at corridor-local z, given player distance d. */
  private curveY(d: number, z: number): number {
    return pathOffsetY(d - z) - pathOffsetY(d);
  }

  private buildCorridor(): void {
    const accentColor = THEME_COLORS[this.theme].accent;

    // --- Tessellated longitudinal edges ---
    // 4 long edges: bottom-left, bottom-right, top-left, top-right
    // Each is a polyline of EDGE_SEGS segments → EDGE_VERTS_PER_LINE points
    // As LineSegments: EDGE_SEGS × 2 verts per edge = EDGE_SEGS * 2 verts
    // Total verts across 4 edges: 4 × EDGE_SEGS × 2
    this.corridorEdgeBases = [
      [-W, FLOOR_Y],  // bottom-left
      [ W, FLOOR_Y],  // bottom-right
      [-W, CEIL_Y ],  // top-left
      [ W, CEIL_Y ],  // top-right
    ];
    const edgeVertCount = 4 * EDGE_SEGS * 2 * 3; // 4 edges × segs × 2 endpoints × 3 floats
    this.corridorEdgePositions = new Float32Array(edgeVertCount);
    // Initialize with placeholder (setScroll will fill them)
    this.corridorEdgeGeom = new BufferGeometry();
    this.corridorEdgeGeom.setAttribute("position", new Float32BufferAttribute(this.corridorEdgePositions, 3));
    this.corridorEdgeMaterial = new LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.5 });
    const edgeLines = new LineSegments(this.corridorEdgeGeom, this.corridorEdgeMaterial);
    this.scene.add(edgeLines);

    // --- Scrolling rungs ---
    // Each rung: 4 segments = 8 vertices tracing rectangle (±W, FLOOR_Y) → (±W, CEIL_Y)
    // Segment pairs: bottom, right, top, left
    const rungVertCount = RUNGS * 8 * 3; // RUNGS rungs × 8 vertices × 3 floats
    this.corridorRungPositions = new Float32Array(rungVertCount);
    this.corridorRungGeom = new BufferGeometry();
    this.corridorRungGeom.setAttribute(
      "position",
      new Float32BufferAttribute(this.corridorRungPositions, 3),
    );
    this.corridorRungMaterial = new LineBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.5,
    });
    const rungLines = new LineSegments(this.corridorRungGeom, this.corridorRungMaterial);
    this.scene.add(rungLines);

    // --- Floor grid (fades in during the last stretch of a level) ---
    // Longitudinal lines: (LONG+1) lines, each tessellated like edges
    // Lateral lines: RUNGS lines at fixed z each, just 2 endpoints
    this.corridorFloorLineX = new Float32Array(LONG + 1);
    for (let i = 0; i <= LONG; i++) {
      this.corridorFloorLineX[i] = -W + (2 * W * i) / LONG;
    }
    this.corridorFloorLateralZ = new Float32Array(RUNGS);
    for (let i = 0; i < RUNGS; i++) {
      this.corridorFloorLateralZ[i] = NEAR_Z - i * SPACING;
    }

    // Floor buffer: longitudinal (LONG+1 lines × EDGE_SEGS × 2 verts) + lateral (RUNGS × 2 verts)
    const floorLongVerts = (LONG + 1) * EDGE_SEGS * 2 * 3;
    const floorLatVerts = RUNGS * 2 * 3;
    this.corridorFloorPositions = new Float32Array(floorLongVerts + floorLatVerts);
    this.corridorFloorGeom = new BufferGeometry();
    this.corridorFloorGeom.setAttribute("position", new Float32BufferAttribute(this.corridorFloorPositions, 3));
    this.corridorFloorMaterial = new LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0 });
    const floorGrid = new LineSegments(this.corridorFloorGeom, this.corridorFloorMaterial);
    this.scene.add(floorGrid);
  }

  setScroll(distance: number, progress = 0): void {
    const d = Math.max(0, distance);
    // Corridor widens and narrows slowly as the run progresses (rooms of varying size).
    const w = 4.6 + 1.0 * Math.sin(d * 0.045);

    // Rungs: apply current width + scrolling z + curve offset.
    const rungXSign = [-1, 1, 1, 1, 1, -1, -1, -1];
    const rungYIsCeil = [0, 0, 0, 1, 1, 1, 1, 0];
    for (let i = 0; i < RUNGS; i++) {
      const z = ((d + i * SPACING) % CORRIDOR_DEPTH) - CORRIDOR_DEPTH;
      const cx = this.curveX(d, z);
      const cy = this.curveY(d, z);
      const base = i * 8 * 3;
      for (let v = 0; v < 8; v++) {
        this.corridorRungPositions[base + v * 3 + 0] = rungXSign[v] * w + cx;
        this.corridorRungPositions[base + v * 3 + 1] = (rungYIsCeil[v] ? CEIL_Y : FLOOR_Y) + cy;
        this.corridorRungPositions[base + v * 3 + 2] = z;
      }
    }
    const rattr = this.corridorRungGeom.getAttribute("position") as Float32BufferAttribute;
    rattr.copyArray(this.corridorRungPositions);
    rattr.needsUpdate = true;

    // Tessellated edges: 4 edges × EDGE_SEGS segments.
    // Each segment is 2 verts (LineSegments). z goes from NEAR_Z to -CORRIDOR_DEPTH.
    for (let e = 0; e < 4; e++) {
      const [baseX, baseY] = this.corridorEdgeBases[e];
      const xSign = baseX < 0 ? -1 : 1;
      const edgeOffset = e * EDGE_SEGS * 2 * 3;
      for (let s = 0; s < EDGE_SEGS; s++) {
        const z0 = NEAR_Z - s * EDGE_SEG_LEN;
        const z1 = NEAR_Z - (s + 1) * EDGE_SEG_LEN;
        const cx0 = this.curveX(d, z0);
        const cx1 = this.curveX(d, z1);
        const cy0 = this.curveY(d, z0);
        const cy1 = this.curveY(d, z1);
        const off = edgeOffset + s * 2 * 3;
        this.corridorEdgePositions[off + 0] = xSign * w + cx0;
        this.corridorEdgePositions[off + 1] = baseY + cy0;
        this.corridorEdgePositions[off + 2] = z0;
        this.corridorEdgePositions[off + 3] = xSign * w + cx1;
        this.corridorEdgePositions[off + 4] = baseY + cy1;
        this.corridorEdgePositions[off + 5] = z1;
      }
    }
    const eattr = this.corridorEdgeGeom.getAttribute("position") as Float32BufferAttribute;
    eattr.copyArray(this.corridorEdgePositions);
    eattr.needsUpdate = true;

    // Floor grid: tessellated longitudinal lines + curved lateral lines.
    // Longitudinal (LONG+1 lines, each EDGE_SEGS segments):
    const floorLongStride = EDGE_SEGS * 2 * 3;
    for (let li = 0; li <= LONG; li++) {
      const baseX = this.corridorFloorLineX[li];
      const lineOff = li * floorLongStride;
      for (let s = 0; s < EDGE_SEGS; s++) {
        const z0 = NEAR_Z - s * EDGE_SEG_LEN;
        const z1 = NEAR_Z - (s + 1) * EDGE_SEG_LEN;
        const cx0 = this.curveX(d, z0);
        const cx1 = this.curveX(d, z1);
        const cy0 = this.curveY(d, z0);
        const cy1 = this.curveY(d, z1);
        const off = lineOff + s * 2 * 3;
        this.corridorFloorPositions[off + 0] = baseX + cx0;
        this.corridorFloorPositions[off + 1] = FLOOR_Y + cy0;
        this.corridorFloorPositions[off + 2] = z0;
        this.corridorFloorPositions[off + 3] = baseX + cx1;
        this.corridorFloorPositions[off + 4] = FLOOR_Y + cy1;
        this.corridorFloorPositions[off + 5] = z1;
      }
    }
    // Lateral floor lines (sit at a single z, just offset X by curveX):
    const latBase = (LONG + 1) * floorLongStride;
    for (let i = 0; i < RUNGS; i++) {
      const z = this.corridorFloorLateralZ[i];
      const cx = this.curveX(d, z);
      const cy = this.curveY(d, z);
      const off = latBase + i * 2 * 3;
      this.corridorFloorPositions[off + 0] = -w + cx;
      this.corridorFloorPositions[off + 1] = FLOOR_Y + cy;
      this.corridorFloorPositions[off + 2] = z;
      this.corridorFloorPositions[off + 3] =  w + cx;
      this.corridorFloorPositions[off + 4] = FLOOR_Y + cy;
      this.corridorFloorPositions[off + 5] = z;
    }
    const fattr = this.corridorFloorGeom.getAttribute("position") as Float32BufferAttribute;
    fattr.copyArray(this.corridorFloorPositions);
    fattr.needsUpdate = true;

    // Brightness undulates as you travel.
    const op = 0.45 + 0.2 * Math.sin(d * 0.06);
    this.corridorEdgeMaterial.opacity = op;
    this.corridorRungMaterial.opacity = op;

    // Floor grid fades in over the last 30% of the level.
    this.corridorFloorMaterial.opacity = Math.min(1, Math.max(0, (progress - 0.7) / 0.3)) * 0.55;

    // Camera banks into upcoming turns.
    const aheadOff = pathOffsetX(d + 12) - pathOffsetX(d);
    this.camera.rotation.z = Math.max(-0.22, Math.min(0.22, -aheadOff * 0.05));

    // Camera noses up climbing a hill and down over a crest.
    const slopeAhead = pathOffsetY(d + 12) - pathOffsetY(d);
    this.camera.rotation.x = Math.max(-0.3, Math.min(0.3, slopeAhead * 0.03));

    this.scenery.update(distance);
  }

  shake(amount = 0.35): void {
    this.shakeT = Math.max(this.shakeT, amount);
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    const c = THEME_COLORS[theme];
    this.scene.fog = new Fog(c.fog, 10, 90);
    this.scene.background = new Color(c.fog);
    if (this.corridorEdgeMaterial) {
      this.corridorEdgeMaterial.color.setHex(c.accent);
    }
    if (this.corridorRungMaterial) {
      this.corridorRungMaterial.color.setHex(c.accent);
    }
    if (this.corridorFloorMaterial) {
      this.corridorFloorMaterial.color.setHex(c.accent);
    }
    this.scenery?.setTheme(theme);
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private makeMesh(item: RenderItem): Mesh {
    const c = THEME_COLORS[this.theme];
    if (item.kind === "powerup") {
      return new Mesh(
        new OctahedronGeometry(item.size),
        new MeshStandardMaterial({ color: 0xff5cc8, emissive: 0xff5cc8, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 }),
      );
    }
    if (item.kind === "crystal") {
      return new Mesh(
        new OctahedronGeometry(item.size),
        new MeshStandardMaterial({ color: c.crystal, emissive: c.crystal, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 }),
      );
    }
    if (item.kind === "ball") {
      return new Mesh(
        new SphereGeometry(item.size, 16, 16),
        new MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.2 }),
      );
    }
    if (item.kind === "door") {
      return new Mesh(
        new BoxGeometry(item.size * 2, item.size * 2, 0.3),
        new MeshStandardMaterial({ color: 0xffc04d, transparent: true, opacity: 0.9, metalness: 0.5, roughness: 0.3, emissive: 0x5a3d00, emissiveIntensity: 0.35 }),
      );
    }
    if (item.spin !== undefined) {
      const mat = new MeshStandardMaterial({ color: c.glass, transparent: true, opacity: 0.85, metalness: 0.2, roughness: 0.1, emissive: c.glass, emissiveIntensity: 0.2 });
      const hub = new Mesh(new BoxGeometry(item.size * 0.5, item.size * 0.5, 0.2), mat);
      hub.add(new Mesh(new BoxGeometry(item.size * 2.6, item.size * 0.5, 0.18), mat));
      hub.add(new Mesh(new BoxGeometry(item.size * 0.5, item.size * 2.6, 0.18), mat));
      return hub;
    }
    return new Mesh(
      new BoxGeometry(item.size * 2, item.size * 2, 0.2),
      new MeshStandardMaterial({ color: c.glass, transparent: true, opacity: 0.8, metalness: 0.1, roughness: 0.1, emissive: c.glass, emissiveIntensity: 0.15 }),
    );
  }

  private makeCracks(size: number): LineSegments {
    const z = 0.18;
    const pts: number[] = [];
    const radials = 9;
    const angles: number[] = [];
    for (let i = 0; i < radials; i++) {
      const a = (i / radials) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      angles.push(a);
      const steps = 4;
      let px = 0, py = 0;
      for (let s = 1; s <= steps; s++) {
        const r = (s / steps) * size * 0.95;
        const jitter = (Math.random() - 0.5) * size * 0.18;
        const nx = Math.cos(a) * r + Math.cos(a + Math.PI / 2) * jitter;
        const ny = Math.sin(a) * r + Math.sin(a + Math.PI / 2) * jitter;
        pts.push(px, py, z, nx, ny, z);
        px = nx; py = ny;
      }
    }
    for (const ringR of [0.4, 0.72]) {
      for (let i = 0; i < radials; i++) {
        const a1 = angles[i];
        const a2 = angles[(i + 1) % radials];
        const r1 = ringR * size * (0.9 + Math.random() * 0.2);
        const r2 = ringR * size * (0.9 + Math.random() * 0.2);
        pts.push(Math.cos(a1) * r1, Math.sin(a1) * r1, z, Math.cos(a2) * r2, Math.sin(a2) * r2, z);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pts, 3));
    const m = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    return new LineSegments(g, m);
  }

  sync(items: RenderItem[]): void {
    const seen = new Set<number>();
    for (const item of items) {
      seen.add(item.id);
      let mesh = this.meshes.get(item.id);
      if (!mesh) {
        mesh = this.makeMesh(item);
        this.meshes.set(item.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.copy(item.pos);
      if (item.spin !== undefined) mesh.rotation.z = item.spin;
      if (item.kind === "door" && item.damaged && !mesh.userData.cracked) {
        mesh.add(this.makeCracks(item.size));
        mesh.userData.cracked = true;
      }
    }
    for (const [id, mesh] of this.meshes) {
      if (!seen.has(id)) {
        for (const child of mesh.children) {
          const ls = child as LineSegments;
          ls.geometry.dispose();
          (ls.material as LineBasicMaterial).dispose();
        }
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as MeshStandardMaterial).dispose();
        this.meshes.delete(id);
      }
    }
  }

  render(): void {
    if (this.shakeT > 0.0001) {
      const k = this.shakeT;
      const ox = (Math.random() - 0.5) * k;
      const oy = (Math.random() - 0.5) * k;
      this.camera.position.x += ox;
      this.camera.position.y += oy;
      this.renderer.render(this.scene, this.camera);
      this.camera.position.x -= ox;
      this.camera.position.y -= oy;
      this.shakeT *= 0.85;
    } else {
      this.shakeT = 0;
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose(): void {
    for (const [, mesh] of this.meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
    }
    this.meshes.clear();
    this.corridorRungGeom.dispose();
    this.corridorEdgeMaterial.dispose();
    this.corridorRungMaterial.dispose();
    this.corridorEdgeGeom.dispose();
    this.corridorFloorGeom.dispose();
    this.corridorFloorMaterial.dispose();
    this.scenery.dispose();
    this.renderer.dispose();
  }
}
