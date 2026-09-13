import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Judoka } from "../api/types";
import { createGameState } from "../state";
import { draw, type OrchestratorDeps } from "./orchestrator";

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
