import { afterEach, describe, expect, it, vi } from "vitest";
import { copyReplaySeed, clearAndExit, handleSaveReplaySeed, resolve, MATCH_RESOLUTION_DELAY_MS } from "../game/orchestrator";
import { BudokonClient } from "../api/budokon";
import { createMockGameState, createMockMatch, createMockJudoka } from "../test/mocks";
import type { TacticalAssessmentResult } from "../game/tacticalAssessment";

function dependencies() {
  return { client: new BudokonClient(), render: vi.fn(), notify: vi.fn(), clearNotices: vi.fn(), renderTactical: vi.fn(), viewTactics: vi.fn() };
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("[REQ-UI-018, REQ-UI-021] notification event policy", () => {
  it("confirms seed saves and clears after the dialog closes", () => {
    const state = createMockGameState({ seedModalOpen: true });
    const deps = dependencies();
    handleSaveReplaySeed(state, ' test ', deps);
    expect(state.seedModalOpen).toBe(false);
    expect(deps.notify).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'Replay seed set.', duration: 4000 }));
    handleSaveReplaySeed(state, '', deps);
    expect(deps.notify).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'Fresh matchups enabled.' }));
  });

  it("copies without rerendering the game, ignores completion after quit", async () => {
    let complete!: () => void;
    const writeText = vi.fn(() => new Promise<void>(done => { complete = done; }));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const state = createMockGameState({ match: createMockMatch(), activeSeed: 'seed' });
    const deps = dependencies();
    const copy = copyReplaySeed(state, deps);
    complete();
    await copy;
    expect(deps.notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'Replay seed copied.' }));
    expect(deps.render).not.toHaveBeenCalled();
    expect(state.seedMessage).toBe('');
    deps.notify.mockClear();
    const staleCopy = copyReplaySeed(state, deps);
    clearAndExit(state, deps);
    complete();
    await staleCopy;
    expect(deps.notify).not.toHaveBeenCalled();
    expect(deps.clearNotices).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it.each([false, true])("announces only visible Dojo notes (has prior loss: %s)", async (hasLoss) => {
    vi.useFakeTimers();
    const match = createMockMatch({ target: 1, player: createMockJudoka('p', { stats: { power: 9, speed: 9, technique: 9, kumikata: 9, newaza: 9 } }) });
    const state = createMockGameState({ match, history: hasLoss ? [{ outcome: 'opponent', stat: 'speed', roundNumber: 1 }] : [] });
    const deps = { ...dependencies(), assessTactics: vi.fn(async (): Promise<TacticalAssessmentResult> => ({ assessment: { adaptation: true } })) };
    resolve(state, match, 'power', deps);
    await vi.advanceTimersByTimeAsync(MATCH_RESOLUTION_DELAY_MS);
    expect(deps.notify).toHaveBeenCalledTimes(hasLoss ? 1 : 0);
    if (hasLoss) expect(deps.notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'Dojo notes ready.', action: { label: 'View', run: deps.viewTactics } }));
    expect(deps.renderTactical).toHaveBeenCalledOnce();
    expect(deps.render).toHaveBeenCalledTimes(2);
  });

  it.each(['issue', 'reject', 'throw'])("keeps optional-service %s failures out of blocking errors", async (kind) => {
    vi.useFakeTimers();
    const match = createMockMatch({ target: 1, player: createMockJudoka('p', { stats: { power: 9, speed: 9, technique: 9, kumikata: 9, newaza: 9 } }) });
    const state = createMockGameState({ match });
    const deps = { ...dependencies(), assessTactics: (): Promise<TacticalAssessmentResult> => {
      if (kind === 'throw') throw new Error('provider details');
      if (kind === 'reject') return Promise.reject(new Error('provider details'));
      return Promise.resolve({ assessment: null, issue: 'invalid_api_key' });
    } };
    resolve(state, match, 'power', deps);
    await vi.advanceTimersByTimeAsync(MATCH_RESOLUTION_DELAY_MS);
    expect(state.errorMessage).toBe('');
    expect(state.tacticalIssue).toBe('Optional Dojo notes are unavailable. Your match summary is still available.');
    expect(deps.notify).not.toHaveBeenCalled();
    expect(deps.renderTactical).toHaveBeenCalledOnce();
  });
});
