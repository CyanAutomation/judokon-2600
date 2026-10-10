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
    it("[REQ-GAME-012] offers the documented weight classes in catalogue order", () => {
      expect(weights).toEqual([
        "-48",
        "-52",
        "-57",
        "-60",
        "-63",
        "-66",
        "-70",
        "-73",
        "-78",
        "-81",
        "-90",
        "-100",
        "+78",
        "+100"
      ]);
    });
  });

  describe("lengths", () => {
    it("[REQ-GAME-011] offers the documented match length options", () => {
      expect(lengths).toEqual([3, 5, 10]);
    });
  });
});
