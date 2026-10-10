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
  it("only creates an audio context while sound is enabled", async () => {
    const { initAudio, keyboardTick, setSoundEnabled } = await loadAudio();

    initAudio(false);
    keyboardTick();
    expect(FakeAudioContext.instances).toHaveLength(0);

    initAudio(true);
    keyboardTick();
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(FakeAudioContext.instances[0]?.oscillators).toHaveLength(1);

    setSoundEnabled(false);
    keyboardTick();
    expect(FakeAudioContext.instances[0]?.oscillators).toHaveLength(1);
  });

  it("schedules the keyboard tick with its configured tone", async () => {
    const { initAudio, keyboardTick } = await loadAudio();

    initAudio(true);
    keyboardTick();

    const context = FakeAudioContext.instances[0]!;
    const oscillator = context.oscillators[0]!;
    const gain = context.gains[0]!;
    expect(oscillator.type).toBe("square");
    expect(oscillator.frequency.value).toBe(780);
    expect(oscillator.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(context.destination);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.014, 2);
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 2.025);
    expect(oscillator.start).toHaveBeenCalledOnce();
    expect(oscillator.stop).toHaveBeenCalledWith(2.025);
  });

  it("resumes a suspended audio context before playing", async () => {
    FakeAudioContext.initialState = "suspended";
    const { initAudio, keyboardTick } = await loadAudio();

    initAudio(true);
    keyboardTick();

    expect(FakeAudioContext.instances[0]?.resume).toHaveBeenCalledOnce();
  });

  it("plays both player-win notes at their configured delays", async () => {
    vi.useFakeTimers();
    const { initAudio, outcomeBeep } = await loadAudio();
    initAudio(true);

    outcomeBeep("player");
    expect(FakeAudioContext.instances).toHaveLength(0);

    vi.advanceTimersByTime(0);
    expect(FakeAudioContext.instances[0]?.oscillators).toHaveLength(1);
    expect(FakeAudioContext.instances[0]?.oscillators[0]?.frequency.value).toBe(880);

    vi.advanceTimersByTime(95);
    const context = FakeAudioContext.instances[0]!;
    expect(context.oscillators.map(({ frequency }) => frequency.value)).toEqual([880, 1175]);
    for (const gain of context.gains) {
      expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.025, 2);
    }
  });

  it.each([
    { outcome: "opponent" as const, frequency: 220, duration: 0.16, volume: 0.03 },
    { outcome: "draw" as const, frequency: 520, duration: 0.1, volume: 0.018 }
  ])("plays the configured $outcome outcome tone", async ({ outcome, frequency, duration, volume }) => {
    const { initAudio, outcomeBeep } = await loadAudio();
    initAudio(true);

    outcomeBeep(outcome);

    const context = FakeAudioContext.instances[0]!;
    expect(context.oscillators[0]?.frequency.value).toBe(frequency);
    expect(context.gains[0]?.gain.setValueAtTime).toHaveBeenCalledWith(volume, 2);
    expect(context.oscillators[0]?.stop).toHaveBeenCalledWith(2 + duration);
  });
});
