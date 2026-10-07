import { describe, expect, it } from "vitest";
import { labels, weights, lengths } from "./constants";
import type { StatKey } from "../api/types";

describe("constants", () => {
  describe("labels", () => {
    it("[REQ-UI-012] uses the documented display label for each stat key", () => {
      const expectedLabels: Record<StatKey, string> = {
        power: "Power",
        speed: "Speed",
        technique: "Technique",
        kumikata: "Kumi-kata",
        newaza: "Ne-waza"
      };

      expect(labels).toEqual(expectedLabels);
    });
  });

  describe("weights", () => {
    it("exports weight classes", () => {
      expect(weights).toHaveLength(14);
      expect(weights[0]).toBe("-48");
      expect(weights[weights.length - 1]).toBe("+100");
    });

    it("includes all standard weight classes", () => {
      expect(weights).toContain("-73");
      expect(weights).toContain("-90");
      expect(weights).toContain("+78");
    });
  });

  describe("lengths", () => {
    it("[REQ-GAME-011] offers the documented match length options", () => {
      expect(lengths).toEqual([3, 5, 10]);
    });
  });
});
