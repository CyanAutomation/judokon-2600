import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type GainNodeStub = {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
};

type OscillatorStub = {
  type: string;
  frequency: { value: number };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

function createGainNode(): GainNodeStub {
  return {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    },
    connect: vi.fn()
  };
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static initialState: AudioContextState = "running";

  readonly state = FakeAudioContext.initialState;
  readonly currentTime = 2;
  readonly destination = {};
  readonly oscillators: OscillatorStub[] = [];
  readonly gains: GainNodeStub[] = [];
  private currentGain = createGainNode();
  readonly resume = vi.fn(async () => undefined);

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createOscillator(): OscillatorStub {
    const oscillator: OscillatorStub = {
      type: "sine",
      frequency: { value: 0 },
      connect: vi.fn(() => this.currentGain),
      start: vi.fn(),
      stop: vi.fn()
    };
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain(): GainNodeStub {
    this.currentGain = createGainNode();
    this.gains.push(this.currentGain);
    return this.currentGain;
  }
}

async function loadAudio() {
  vi.resetModules();
  return import("./audio");
}

beforeEach(() => {
  FakeAudioContext.instances = [];
  FakeAudioContext.initialState = "running";
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("audio feedback", () => {
  it("[REQ-AUDIO-016] plays keyboard feedback only while sound is enabled", async () => {
    vi.useFakeTimers();
    const { initAudio, keyboardTick, outcomeBeep, setSoundEnabled } = await loadAudio();

    keyboardTick();
    expect(FakeAudioContext.instances).toHaveLength(0);

    initAudio(true);
    keyboardTick();
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(FakeAudioContext.instances[0]?.oscillators).toHaveLength(1);

    setSoundEnabled(false);
    keyboardTick();
    outcomeBeep("player");
    vi.runAllTimers();
    expect(FakeAudioContext.instances[0]?.oscillators).toHaveLength(1);
  });

  it("resumes a suspended audio context before playing", async () => {
    FakeAudioContext.initialState = "suspended";
    const { initAudio, keyboardTick } = await loadAudio();

    initAudio(true);
    keyboardTick();

    expect(FakeAudioContext.instances[0]?.resume).toHaveBeenCalledOnce();
  });

  it.each(["player", "opponent", "draw"] as const)(
    "[REQ-AUDIO-016] plays outcome feedback for a %s result",
    async (outcome) => {
      vi.useFakeTimers();
      const { initAudio, outcomeBeep } = await loadAudio();
      initAudio(true);

      outcomeBeep(outcome);
      vi.runAllTimers();

      const oscillators = FakeAudioContext.instances.flatMap(({ oscillators }) => oscillators);
      expect(oscillators.length).toBeGreaterThan(0);
      expect(oscillators.every(({ start }) => start.mock.calls.length === 1)).toBe(true);
    }
  );
});
