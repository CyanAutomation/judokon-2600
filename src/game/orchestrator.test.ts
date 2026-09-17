import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Judoka } from "../api/types";
import { createGameState } from "../state";
import { draw, next, type OrchestratorDeps } from "./orchestrator";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function judoka(id: string): Judoka {
  return {
    id,
    slug: id,
    firstname: id,
    surname: "Fighter",
    country: "Japan",
    countryCode: "JP",
    weightClass: "-73",
    stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 }
  };
}

describe("draw operation ordering", () => {
  beforeEach(() => sessionStorage.clear());

  it("ignores an older draw that resolves after the newest draw", async () => {
    const older = deferred<Judoka[]>();
    const newer = deferred<Judoka[]>();
    const client = { drawBatch: vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise) };
    const render = vi.fn();
    const onMatchReady = vi.fn();
    const state = createGameState();
    state.activeSeed = "older-seed";
    state.target = 3;
    state.mode = "classic";
    state.activeWeight = "-73";
    const deps = { client, render, onMatchReady } as unknown as OrchestratorDeps;

    const olderDraw = draw(state, deps);
    state.activeSeed = "newer-seed";
    state.target = 10;
    state.mode = "champion";
    state.activeWeight = "-90";
    const newerDraw = draw(state, deps);

    newer.resolve(Array.from({ length: 6 }, (_, index) => judoka(`new-${index}`)));
    await newerDraw;
    const persisted = sessionStorage.getItem("judokon.activeMatch.v1");

    older.resolve(Array.from({ length: 6 }, (_, index) => judoka(`old-${index}`)));
    await olderDraw;

    expect(client.drawBatch).toHaveBeenNthCalledWith(1, "older-seed", 6, "-73", undefined);
    expect(client.drawBatch).toHaveBeenNthCalledWith(2, "newer-seed", 6, "-90", undefined);
    expect(state.match).toMatchObject({ player: { id: "new-0" }, opponent: { id: "new-1" }, target: 10, mode: "champion" });
    expect(state.errorMessage).toBe("");
    expect(state.busy).toBe(false);
    expect(sessionStorage.getItem("judokon.activeMatch.v1")).toBe(persisted);
    expect(persisted).toContain("new-0");
    expect(persisted).not.toContain("old-0");
    expect(onMatchReady).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledTimes(3);
  });

  it("keeps the newest error when an older draw later succeeds", async () => {
    const older = deferred<Judoka[]>();
    const newer = deferred<Judoka[]>();
    const client = { drawBatch: vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise) };
    const onMatchReady = vi.fn();
    const state = createGameState();
    state.activeSeed = "older";
    const deps = { client, render: vi.fn(), onMatchReady } as unknown as OrchestratorDeps;

    const olderDraw = draw(state, deps);
    state.activeSeed = "newer";
    const newerDraw = draw(state, deps);
    newer.reject(new Error("newest failed"));
    await newerDraw;
    older.resolve(Array.from({ length: 6 }, (_, index) => judoka(`old-${index}`)));
    await olderDraw;

    expect(state.match).toBeNull();
    expect(state.errorMessage).toBe("newest failed. Check your connection and try again.");
    expect(state.busy).toBe(false);
    expect(sessionStorage.getItem("judokon.activeMatch.v1")).toBeNull();
    expect(onMatchReady).not.toHaveBeenCalled();
  });
});

describe("next-round draws", () => {
  beforeEach(() => sessionStorage.clear());

  it("refills a one-fighter Classic buffer and advances and saves only once", async () => {
    const buffered = judoka("buffered");
    const replacements = Array.from({ length: 6 }, (_, index) => judoka(`replacement-${index}`));
    const client = { drawBatch: vi.fn().mockResolvedValue(replacements) };
    const match = {
      player: judoka("current-player"),
      opponent: judoka("current-opponent"),
      target: 3,
      matchNumber: 4,
      scores: { player: 2, opponent: 1 },
      mode: "classic" as const,
      phase: "awaitingNext" as const,
      winner: null
    };
    const state = createGameState();
    state.activeSeed = "classic-run";
    state.activeWeight = "-73";
    state.match = match;
    state.mode = "classic";
    state.drawBuffer = [buffered];
    const render = vi.fn();
    const deps = { client, render } as unknown as OrchestratorDeps;
    const saveSpy = vi.spyOn(Storage.prototype, "setItem");

    const firstTransition = next(state, match, deps);
    const duplicateTransition = next(state, match, deps);
    await Promise.all([firstTransition, duplicateTransition]);

    expect(client.drawBatch).toHaveBeenCalledOnce();
    expect(client.drawBatch).toHaveBeenCalledWith("classic-run:buffer:5", 6, "-73", undefined);
    expect(state.match).toMatchObject({
      player: { id: "replacement-0" },
      opponent: { id: "replacement-1" },
      matchNumber: 5,
      phase: "selecting"
    });
    expect(state.drawBuffer.map(({ id }) => id)).toEqual([
      "replacement-2",
      "replacement-3",
      "replacement-4",
      "replacement-5"
    ]);
    expect(state.drawBuffer).not.toContain(buffered);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("uses a two-fighter Classic buffer without refilling it", async () => {
    const client = { drawBatch: vi.fn() };
    const match = {
      player: judoka("current-player"),
      opponent: judoka("current-opponent"),
      target: 3,
      matchNumber: 2,
      scores: { player: 1, opponent: 0 },
      mode: "classic" as const,
      phase: "awaitingNext" as const,
      winner: null
    };
    const state = createGameState();
    state.activeSeed = "classic-buffered-run";
    state.match = match;
    state.mode = "classic";
    state.drawBuffer = [judoka("next-player"), judoka("next-opponent")];
    const deps = { client, render: vi.fn() } as unknown as OrchestratorDeps;

    await next(state, match, deps);

    expect(client.drawBatch).not.toHaveBeenCalled();
    expect(state.match).toMatchObject({
      player: { id: "next-player" },
      opponent: { id: "next-opponent" },
      matchNumber: 3,
      phase: "selecting"
    });
    expect(state.drawBuffer).toEqual([]);
  });

  it("refills a depleted Champion buffer without redrawing either current fighter", async () => {
    const champion = judoka("champion");
    const lastOpponent = judoka("last-opponent");
    const replacements = Array.from({ length: 5 }, (_, index) => judoka(`replacement-${index}`));
    const client = { drawBatch: vi.fn().mockResolvedValue(replacements) };
    const match = {
      player: champion,
      opponent: lastOpponent,
      target: 3,
      matchNumber: 4,
      scores: { player: 2, opponent: 1 },
      mode: "champion" as const,
      phase: "awaitingNext" as const,
      winner: null
    };
    const state = createGameState();
    state.activeSeed = "champion-run";
    state.activeWeight = "-73";
    state.match = match;
    state.mode = "champion";
    state.drawBuffer = [];
    const deps = { client, render: vi.fn() } as unknown as OrchestratorDeps;

    await next(state, match, deps);

    expect(client.drawBatch).toHaveBeenCalledOnce();
    expect(client.drawBatch).toHaveBeenCalledWith(
      "champion-run:buffer:5",
      5,
      "-73",
      [champion.id, lastOpponent.id]
    );
    expect(state.match).toMatchObject({
      player: { id: champion.id },
      opponent: { id: "replacement-0" },
      matchNumber: 5,
      phase: "selecting"
    });
    expect(state.drawBuffer.map(({ id }) => id)).toEqual([
      "replacement-1",
      "replacement-2",
      "replacement-3",
      "replacement-4"
    ]);
  });
});
