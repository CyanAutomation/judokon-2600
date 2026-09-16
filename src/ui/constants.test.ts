import { describe, expect, it } from "vitest";
import { labels, weights, lengths } from "./constants";
import type { StatKey } from "../api/types";

describe("constants", () => {
  describe("labels", () => {
    it("exports stat labels for all stat keys", () => {
      const statKeys: StatKey[] = ["power", "speed", "technique", "kumikata", "newaza"];

      for (const stat of statKeys) {
        expect(labels[stat]).toBeDefined();
        expect(typeof labels[stat]).toBe("string");
      }
    });

    it("has specific label values", () => {
      expect(labels.power).toBe("Power");
      expect(labels.speed).toBe("Speed");
      expect(labels.technique).toBe("Technique");
      expect(labels.kumikata).toBe("Kumi-kata");
      expect(labels.newaza).toBe("Ne-waza");
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
    it("exports match length options", () => {
      expect(lengths).toEqual([3, 5, 10]);
    });

    it("has numeric length values", () => {
      for (const length of lengths) {
        expect(typeof length).toBe("number");
        expect(length > 0).toBe(true);
      }
    });
  });
});
