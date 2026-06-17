import {
  Scene, PerspectiveCamera, WebGLRenderer, Fog, AmbientLight, DirectionalLight,
  Mesh, BoxGeometry, OctahedronGeometry, SphereGeometry, MeshStandardMaterial,
  Vector3, Color,
} from "three";
import { THEME_COLORS } from "./themes";
import type { Theme } from "../content/types";

export interface RenderItem {
  id: number;
  kind: "obstacle" | "crystal" | "ball";
  pos: Vector3;
  size: number;
}

export class SceneManager {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private meshes = new Map<number, Mesh>();
  private theme: Theme = "crystalCavern";

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.camera = new PerspectiveCamera(65, 1, 0.1, 200);
    this.camera.position.set(0, 1, 0);
    this.camera.lookAt(new Vector3(0, 1, -10));
    this.scene.add(new AmbientLight(0xffffff, 0.6));
    const dir = new DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 5, 1);
    this.scene.add(dir);
    this.setTheme("crystalCavern");
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    const c = THEME_COLORS[theme];
    this.scene.fog = new Fog(c.fog, 10, 90);
    this.scene.background = new Color(c.fog);
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
    return new Mesh(
      new BoxGeometry(item.size * 2, item.size * 2, 0.2),
      new MeshStandardMaterial({ color: c.glass, transparent: true, opacity: 0.4, metalness: 0.1, roughness: 0.05 }),
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
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const [, mesh] of this.meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
    }
    this.meshes.clear();
    this.renderer.dispose();
  }
}
