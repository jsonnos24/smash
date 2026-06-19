import {
  Scene, PerspectiveCamera, WebGLRenderer, Fog, AmbientLight, DirectionalLight,
  Mesh, BoxGeometry, OctahedronGeometry, SphereGeometry, MeshStandardMaterial,
  Vector3, Color, LineSegments, BufferGeometry, Float32BufferAttribute, LineBasicMaterial,
} from "three";
import { THEME_COLORS } from "./themes";
import type { Theme } from "../content/types";

export interface RenderItem {
  id: number;
  kind: "obstacle" | "crystal" | "ball" | "door";
  pos: Vector3;
  size: number;
  damaged?: boolean;
}

// Corridor geometry constants
const W = 3.2;
const FLOOR_Y = -1.6;
const CEIL_Y = 4.0;
const NEAR_Z = 2;
const CORRIDOR_DEPTH = 96;
const SPACING = 8;
const RUNGS = CORRIDOR_DEPTH / SPACING; // 12

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
  private corridorFloorGeom!: BufferGeometry;
  private corridorFloorMaterial!: LineBasicMaterial;
  private shakeT = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.camera = new PerspectiveCamera(65, 1, 0.1, 200);
    this.camera.position.set(0, 1, 0);
    this.camera.lookAt(new Vector3(0, 1, -10));
    this.scene.add(new AmbientLight(0xffffff, 0.6));
    const dir = new DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 5, 1);
    this.scene.add(dir);
    this.buildCorridor();
    this.setTheme("crystalCavern");
  }

  private buildCorridor(): void {
    const accentColor = THEME_COLORS[this.theme].accent;

    // --- Static longitudinal edges ---
    // 4 long edges of rectangular tube: from NEAR_Z back to -CORRIDOR_DEPTH
    // Corners: (-W, FLOOR_Y), (+W, FLOOR_Y), (-W, CEIL_Y), (+W, CEIL_Y)
    const edgeVerts = new Float32Array([
      // bottom-left edge
      -W, FLOOR_Y, NEAR_Z,   -W, FLOOR_Y, -CORRIDOR_DEPTH,
      // bottom-right edge
       W, FLOOR_Y, NEAR_Z,    W, FLOOR_Y, -CORRIDOR_DEPTH,
      // top-left edge
      -W, CEIL_Y,  NEAR_Z,   -W, CEIL_Y,  -CORRIDOR_DEPTH,
      // top-right edge
       W, CEIL_Y,  NEAR_Z,    W, CEIL_Y,  -CORRIDOR_DEPTH,
    ]);
    this.corridorEdgePositions = edgeVerts;
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

    // Precompute x,y for each rung's 8 vertices (same for all rungs)
    // Rect outline: bottom-left→bottom-right, bottom-right→top-right, top-right→top-left, top-left→bottom-left
    const rungXY = [
      -W, FLOOR_Y,   W, FLOOR_Y,   // bottom
       W, FLOOR_Y,   W, CEIL_Y,    // right
       W, CEIL_Y,   -W, CEIL_Y,    // top
      -W, CEIL_Y,   -W, FLOOR_Y,   // left
    ];

    // Initialize z positions (will be updated by setScroll)
    for (let i = 0; i < RUNGS; i++) {
      const base = i * 8 * 3;
      for (let v = 0; v < 8; v++) {
        this.corridorRungPositions[base + v * 3 + 0] = rungXY[v * 2 + 0];
        this.corridorRungPositions[base + v * 3 + 1] = rungXY[v * 2 + 1];
        this.corridorRungPositions[base + v * 3 + 2] = 0; // placeholder z
      }
    }

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
    const floorVerts: number[] = [];
    const LONG = 6; // longitudinal floor lines across the width
    for (let i = 0; i <= LONG; i++) {
      const x = -W + (2 * W * i) / LONG;
      floorVerts.push(x, FLOOR_Y, NEAR_Z, x, FLOOR_Y, -CORRIDOR_DEPTH);
    }
    for (let i = 0; i < RUNGS; i++) {
      const z = NEAR_Z - i * SPACING; // lateral floor lines every SPACING
      floorVerts.push(-W, FLOOR_Y, z, W, FLOOR_Y, z);
    }
    this.corridorFloorGeom = new BufferGeometry();
    this.corridorFloorGeom.setAttribute("position", new Float32BufferAttribute(new Float32Array(floorVerts), 3));
    this.corridorFloorMaterial = new LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0 });
    const floorGrid = new LineSegments(this.corridorFloorGeom, this.corridorFloorMaterial);
    this.scene.add(floorGrid);
  }

  setScroll(distance: number, progress = 0): void {
    const d = Math.max(0, distance);
    // Corridor widens and narrows slowly as the run progresses (rooms of varying size).
    const w = 3.4 + 0.7 * Math.sin(d * 0.045);

    // Rungs: apply current width + scrolling z.
    const rungXSign = [-1, 1, 1, 1, 1, -1, -1, -1];
    const rungYIsCeil = [0, 0, 0, 1, 1, 1, 1, 0];
    for (let i = 0; i < RUNGS; i++) {
      const z = ((d + i * SPACING) % CORRIDOR_DEPTH) - CORRIDOR_DEPTH;
      const base = i * 8 * 3;
      for (let v = 0; v < 8; v++) {
        this.corridorRungPositions[base + v * 3 + 0] = rungXSign[v] * w;
        this.corridorRungPositions[base + v * 3 + 1] = rungYIsCeil[v] ? CEIL_Y : FLOOR_Y;
        this.corridorRungPositions[base + v * 3 + 2] = z;
      }
    }
    const rattr = this.corridorRungGeom.getAttribute("position") as Float32BufferAttribute;
    rattr.copyArray(this.corridorRungPositions);
    rattr.needsUpdate = true;

    // Edges: apply current width (x = ±w); z unchanged.
    const edgeXSign = [-1, -1, 1, 1, -1, -1, 1, 1];
    for (let v = 0; v < 8; v++) this.corridorEdgePositions[v * 3 + 0] = edgeXSign[v] * w;
    const eattr = this.corridorEdgeGeom.getAttribute("position") as Float32BufferAttribute;
    eattr.copyArray(this.corridorEdgePositions);
    eattr.needsUpdate = true;

    // Brightness undulates as you travel.
    const op = 0.45 + 0.2 * Math.sin(d * 0.06);
    this.corridorEdgeMaterial.opacity = op;
    this.corridorRungMaterial.opacity = op;

    // Floor grid fades in over the last 30% of the level.
    this.corridorFloorMaterial.opacity = Math.min(1, Math.max(0, (progress - 0.7) / 0.3)) * 0.55;
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
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private makeMesh(item: RenderItem): Mesh {
    const c = THEME_COLORS[this.theme];
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
    return new Mesh(
      new BoxGeometry(item.size * 2, item.size * 2, 0.2),
      new MeshStandardMaterial({ color: c.glass, transparent: true, opacity: 0.8, metalness: 0.1, roughness: 0.1, emissive: c.glass, emissiveIntensity: 0.15 }),
    );
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
      if (item.kind === "door") {
        (mesh.material as MeshStandardMaterial).emissive.setHex(item.damaged ? 0x7a1a1a : 0x5a3d00);
      }
    }
    for (const [id, mesh] of this.meshes) {
      if (!seen.has(id)) {
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
    this.renderer.dispose();
  }
}
