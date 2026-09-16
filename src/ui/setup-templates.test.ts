import { describe, expect, it } from "vitest";
import type { GameState } from "../state";
import { advanced, intro } from "./setup-templates";

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    match: null,
    result: null,
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
  it("starts with game mode as the only prominent setup choice", () => {
    const current = state();
    const markup = intro(current);

    expect(markup).toContain("Choose game mode");
    expect(markup).toContain("Classic Battle");
    expect(markup).toContain("Champion");
    expect(markup).not.toContain("Weight class");
    expect(markup).not.toContain('id="start"');
  });

  it("uses one vertical terminal menu with a caret for each staged choice", () => {
    const current = state({ setupStep: "mode" });
    const markup = intro(current);

    expect(markup).toContain('class="terminal-menu"');
    expect(markup).toContain('class="menu-caret"');
    expect(markup).toContain("↑ ↓</span> move");
    expect(markup).not.toContain('class="choice-grid"');
  });

  it("shows a compact mode summary before the division selection", () => {
    const current = state({ setupStep: "division", mode: "champion" });
    const markup = intro(current);

    expect(markup).toContain("Game mode: <strong>Champion</strong>");
    expect(markup).toContain('data-setup-step="mode"');
    expect(markup).toContain("Choose division");
    expect(markup).not.toContain('id="start"');
  });

  it("puts the rules beside the final CTA and keeps settings out of the setup panel", () => {
    const current = state({ setupStep: "length" });
    const markup = intro(current);

    expect(markup).toContain("Higher stat wins the point.");
    expect(markup).toContain('id="start"');
    expect(markup).not.toContain("Advanced options");
  });

  it("renders seed and sound as direct footer utilities, not a disclosure", () => {
    const markup = advanced(state({ replaySeed: "dojo-42" }));

    expect(markup).toContain('id="seed-button"');
    expect(markup).toContain("Seed: dojo-42");
    expect(markup).toContain('id="sound-enabled"');
    expect(markup).not.toContain("<details");
  });

  it("renders an accessible seed dialog when requested", () => {
    const markup = advanced(state({ seedModalOpen: true, seedDraft: "dojo-42" }));

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('id="replay-seed"');
    expect(markup).toContain('id="save-seed"');
  });
});
