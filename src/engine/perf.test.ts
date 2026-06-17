import { describe, it, expect } from "vitest";
import { recommendedQuality } from "./perf";

describe("recommendedQuality", () => {
  it("recommends low quality on slow frames", () => {
    expect(recommendedQuality(30)).toBe("low");
  });
  it("recommends high quality on fast frames", () => {
    expect(recommendedQuality(12)).toBe("high");
  });
});
