import { describe, expect, it } from "vitest";
import type { GameState } from "../state";
import { advanced, intro } from "./setup-templates";

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    match: null,
    result: null,
    tacticalAssessment: null,
    pendingStat: null,
    activeSeed: "",
    activeWeight: undefined,
    drawBuffer: [],
    target: 3,
    lengthIndex: 0,
    busy: false,
    errorMessage: "",
    history: [],
    division: "absolute",
    mode: "classic",
    weight: "random",
    replaySeed: "",
    seedMessage: "",
    ...overrides,
  };
}

describe("setup templates", () => {
  it("[REQ-UI-014] starts with game mode as the only setup choice", () => {
    const current = state();
    const markup = intro(current);

    expect(markup).toContain("Choose game mode");
    expect(markup).toContain("Classic Battle");
    expect(markup).toContain("Champion");
    expect(markup).not.toContain("Weight class");
    expect(markup).not.toContain('id="start"');
  });

  it("[REQ-UI-014] exposes the active setup choices as one native radio group", () => {
    const root = document.createElement("div");
    root.innerHTML = intro(state({ setupStep: "mode" }));

    const panel = root.querySelector(".intro-mode-panel");
    const groups = panel?.querySelectorAll('[role="radiogroup"]');
    const choices = panel?.querySelectorAll('input[type="radio"]');

    expect(panel?.querySelectorAll("fieldset")).toHaveLength(1);
    expect(groups).toHaveLength(1);
    expect(choices).toHaveLength(2);
    expect(panel?.querySelector("legend")?.textContent).toBe("Choose game mode");
  });

  it("[REQ-UI-014] marks the saved mode and division as selected in setup", () => {
    const modeRoot = document.createElement("div");
    modeRoot.innerHTML = intro(state({ mode: "champion", setupStep: "mode", setupCursor: 1 }));
    const divisionRoot = document.createElement("div");
    divisionRoot.innerHTML = intro(state({ division: "weight", setupStep: "division", setupCursor: 1 }));

    expect(modeRoot.querySelector<HTMLInputElement>("#mode-champion")?.checked).toBe(true);
    expect(modeRoot.querySelector('label[for="mode-champion"]')?.classList.contains("is-active")).toBe(true);
    expect(divisionRoot.querySelector<HTMLInputElement>("#division-weight")?.checked).toBe(true);
    expect(divisionRoot.querySelector('label[for="division-weight"]')?.classList.contains("is-active")).toBe(true);
  });

  it("[REQ-UI-014] shows the saved mode before presenting the division choice", () => {
    const current = state({ setupStep: "division", mode: "champion" });
    const root = document.createElement("div");
    root.innerHTML = intro(current);
    const panel = root.querySelector(".intro-mode-panel");

    expect(panel?.querySelector(".setup-summary")?.textContent).toContain("Game mode: Champion");
    expect(panel?.querySelector('[data-setup-step="mode"]')).not.toBeNull();
    expect(panel?.querySelector("legend")?.textContent).toBe("Choose division");
    expect(panel?.querySelectorAll("fieldset")).toHaveLength(1);
    expect(panel?.querySelector("#start")).toBeNull();
  });

  it("renders the selected weight and continuation control in the weight stage", () => {
    const root = document.createElement("div");
    root.innerHTML = intro(state({ division: "weight", weight: "-73", setupStep: "weight" }));
    const panel = root.querySelector(".intro-mode-panel");

    expect(panel?.querySelector("legend")?.textContent).toBe("Choose weight class");
    expect(panel?.querySelector<HTMLSelectElement>("#weight-class")?.value).toBe("-73");
    expect(panel?.querySelector("#confirm-weight")?.textContent).toContain("Continue");
    expect(panel?.querySelector("#start")).toBeNull();
  });

  it("[REQ-UI-015] shows scoring and target context with Start in the final setup stage", () => {
    const current = state({ setupStep: "length", target: 5, lengthIndex: 1 });
    const root = document.createElement("div");
    root.innerHTML = `${intro(current)}${advanced(current)}`;
    const setupPanel = root.querySelector(".intro-mode-panel");

    expect(setupPanel?.querySelector(".setup-rule")?.textContent).toBe("Higher stat wins the point. Draws score no points.");
    expect(setupPanel?.querySelector(".start-context")?.textContent).toBe("First to 5 points");
    expect(setupPanel?.querySelector("#start")?.textContent).toContain("Start match");
    expect(root.querySelector("#seed-button")?.closest(".intro-mode-panel")).toBeNull();
  });

  it("puts the match length on the full clickable choice card", () => {
    const root = document.createElement("div");
    root.innerHTML = intro(state({ setupStep: "length" }));
    const input = root.querySelector<HTMLInputElement>("#length-3");
    const card = input?.closest("label");

    expect(input?.type).toBe("radio");
    expect(input?.name).toBe("match-length");
    expect(input?.dataset.length).toBe("3");
    expect(input?.checked).toBe(true);
    expect(card?.htmlFor).toBe("length-3");
  });

  it("renders seed and sound as direct footer utilities, not a disclosure", () => {
    const markup = advanced(state({ replaySeed: "dojo-42" }));

    expect(markup).toContain('id="seed-button"');
    expect(markup).toContain("Seed: dojo-42");
    expect(markup).toContain('id="sound-enabled"');
    expect(markup).toContain('class="footer-utilities" role="group" aria-label="Match utilities"');
    expect(markup).not.toContain("<details");
  });

  it("renders an accessible seed dialog when requested", () => {
    const markup = advanced(state({ seedModalOpen: true, seedDraft: "dojo-42" }));

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('id="replay-seed"');
    expect(markup).toContain('id="save-seed"');
    expect(markup).toContain("while the Budokon catalogue version stays the same");
  });
});
