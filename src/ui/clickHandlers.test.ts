import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BudokonClient } from "../api/budokon";
import {
  handleCloseSeedModal,
  handleOpenSeedModal,
  handleSaveReplaySeed,
  handleSetupStepClick,
  start,
  type OrchestratorDeps
} from "../game/orchestrator";
import { persistPreferences, type GameState, type SetupStep } from "../state";
import { createMockGameState, createMockJudoka } from "../test/mocks";
import { handleChangeEvent } from "./changeHandlers";
import { handleClickEvent } from "./clickHandlers";
import { renderApp } from "./render";

function createInteractiveApp(state: GameState) {
  const root = document.createElement("div");
  document.body.append(root);

  const drawBatch = vi.fn(async (_seed: string, count: number) =>
    Array.from({ length: count }, (_, index) => createMockJudoka(`draw-${index}`))
  );
  const client = { drawBatch } as unknown as BudokonClient;
  const render = () => renderApp(root, state);
  const deps = { client, render } as OrchestratorDeps;
  let startOperation: Promise<void> | undefined;

  const handlers = {
    start: (seed?: string) => { startOperation = start(state, deps, state.target, seed); },
    copyReplaySeed: async () => undefined,
    next: async () => undefined,
    resolve: () => undefined,
    clearAndExit: () => undefined,
    setSetupStep: (step: SetupStep) => handleSetupStepClick(state, step, deps),
    openSeedModal: () => handleOpenSeedModal(state, deps),
    closeSeedModal: () => handleCloseSeedModal(state, deps),
    saveReplaySeed: (seed: string) => handleSaveReplaySeed(state, seed, deps),
    startWithLength: (points: number) => { startOperation = start(state, deps, points); }
  };

  root.addEventListener("click", event => handleClickEvent(event, state, handlers));
  root.addEventListener("change", event => handleChangeEvent(event, state, root, {
    render,
    persistPreferences: () => persistPreferences(state),
    setSoundEnabled: () => undefined
  }));
  render();

  return {
    root,
    state,
    drawBatch,
    getStartOperation: () => startOperation
  };
}

beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  sessionStorage.clear();
});

describe("setup choices", () => {
  it.each([
    {
      description: "mode",
      state: { setupStep: "mode" as const, mode: "classic" as const, division: "absolute" as const },
      selector: "#mode-champion",
      expectedStep: "division",
      expectedLegend: "Choose division",
      expectedSummary: "Game mode: Champion",
      preferenceKey: "judokon.gameMode",
      preferenceValue: "champion"
    },
    {
      description: "division",
      state: { setupStep: "division" as const, mode: "classic" as const, division: "absolute" as const },
      selector: "#division-weight",
      expectedStep: "weight",
      expectedLegend: "Choose weight class",
      expectedSummary: "Division: Weight class",
      preferenceKey: "judokon.divisionMode",
      preferenceValue: "weight"
    }
  ])("[REQ-UI-014] choosing a new $description advances the rendered setup", scenario => {
    const state = createMockGameState(scenario.state);
    const { root } = createInteractiveApp(state);

    root.querySelector<HTMLInputElement>(scenario.selector)!.click();

    expect(state.setupStep).toBe(scenario.expectedStep);
    expect(root.querySelector("fieldset legend")?.textContent).toBe(scenario.expectedLegend);
    expect(root.querySelector(".setup-context")?.textContent).toContain(scenario.expectedSummary);
    expect(localStorage.getItem(scenario.preferenceKey)).toBe(scenario.preferenceValue);
  });

  it.each([
    {
      step: "mode" as const,
      selector: "#mode-classic",
      expectedLegend: "Choose division"
    },
    {
      step: "division" as const,
      selector: "#division-absolute",
      expectedLegend: "Choose match length"
    }
  ])("[REQ-UI-014] clicking the selected $step choice advances to the next setup stage", scenario => {
    const state = createMockGameState({ setupStep: scenario.step });
    const { root } = createInteractiveApp(state);

    root.querySelector<HTMLInputElement>(scenario.selector)!.click();

    expect(root.querySelector("fieldset legend")?.textContent).toBe(scenario.expectedLegend);
  });

  it("[REQ-KEYBOARD-008] keeps the current setup stage when its selected choice is clicked during a draw", () => {
    const state = createMockGameState({ setupStep: "mode", busy: true });
    const { root } = createInteractiveApp(state);

    root.querySelector<HTMLInputElement>("#mode-classic")!.click();

    expect(state.setupStep).toBe("mode");
    expect(root.querySelector("fieldset legend")?.textContent).toBe("Choose game mode");
  });
});

describe("replay seed dialog", () => {
  it("[REQ-UI-010] saves an edited replay seed only after the user chooses Use seed", () => {
    const state = createMockGameState({ setupStep: "mode", replaySeed: "original-seed" });
    const { root } = createInteractiveApp(state);
    root.querySelector<HTMLDetailsElement>(".footer-settings")!.open = true;

    root.querySelector<HTMLButtonElement>("#seed-button")!.click();

    const dialog = root.querySelector<HTMLElement>('[role="dialog"][aria-labelledby="seed-dialog-title"]');
    const input = dialog?.querySelector<HTMLInputElement>("#replay-seed");
    expect(dialog?.querySelector("h2")?.textContent).toBe("Set a replay seed");
    expect(input?.value).toBe("original-seed");
    expect(document.activeElement).toBe(input);

    input!.value = "  next-seed  ";
    input!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(state.seedDraft).toBe("  next-seed  ");
    expect(state.replaySeed).toBe("original-seed");

    dialog!.querySelector<HTMLButtonElement>("#save-seed")!.click();

    expect(state.replaySeed).toBe("next-seed");
    expect(state.seedModalOpen).toBe(false);
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(root.querySelector<HTMLButtonElement>("#seed-button")?.textContent).toContain("next-seed");
  });

  it("[REQ-UI-010] keeps the saved replay seed when an edit is canceled", () => {
    const state = createMockGameState({ setupStep: "mode", replaySeed: "original-seed" });
    const { root } = createInteractiveApp(state);
    root.querySelector<HTMLDetailsElement>(".footer-settings")!.open = true;
    root.querySelector<HTMLButtonElement>("#seed-button")!.click();

    const input = root.querySelector<HTMLInputElement>("#replay-seed")!;
    input.value = "unsaved-seed";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    root.querySelector<HTMLButtonElement>("#cancel-seed")!.click();

    expect(state.replaySeed).toBe("original-seed");
    expect(state.seedDraft).toBe("unsaved-seed");
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });
});

it("[REQ-GAME-013] starts with the selected target when a match length is clicked", async () => {
  const state = createMockGameState({ setupStep: "length", replaySeed: "length-choice-seed" });
  const { root, drawBatch, getStartOperation } = createInteractiveApp(state);

  root.querySelector<HTMLInputElement>('#length-5')!.click();

  const operation = getStartOperation();
  expect(operation).toBeDefined();
  await operation;

  expect(state.match?.target).toBe(5);
  expect(drawBatch).toHaveBeenCalledOnce();
  expect(root.querySelector('[aria-label^="Match score:"]')?.getAttribute("aria-label")).toContain("First to 5 points");
});
