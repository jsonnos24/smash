export function recommendedQuality(sampleFrameMs: number): "low" | "high" {
  return sampleFrameMs > 22 ? "low" : "high";
}

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}
