import { afterEach, describe, expect, it, vi } from "vitest";
import { createFaultInjectingFetch, type BudokonFaultScenario } from "./faultInjection";

const url = "https://budokon.example.test/v1/draw";

describe("Budokon fault injection", () => {
  afterEach(() => vi.useRealTimers());

  it("passes through and consumes a one-shot response plan in request order", async () => {
    const baseFetch = vi.fn<typeof fetch>().mockImplementation(async () => new Response("{\"judoka\":[]}", { status: 200 }));
    const scenarios: (BudokonFaultScenario | null)[] = [
      { kind: "response", status: 503, body: "temporarily unavailable" },
      null
    ];
    const fetcher = createFaultInjectingFetch(baseFetch, scenarios);

    const failed = await fetcher(url);
    const recovered = await fetcher(url);
    const later = await fetcher(url);

    expect(failed.status).toBe(503);
    expect(await recovered.json()).toEqual({ judoka: [] });
    expect(await later.json()).toEqual({ judoka: [] });
    expect(baseFetch).toHaveBeenCalledTimes(2);
  });

  it("delays the base response by the requested duration", async () => {
    vi.useFakeTimers();
    const baseFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok"));
    const fetcher = createFaultInjectingFetch(baseFetch, [{ kind: "delay", delayMs: 250 }]);

    let settled = false;
    const request = fetcher(url).then(response => {
      settled = true;
      return response;
    });
    await vi.advanceTimersByTimeAsync(249);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(request).resolves.toMatchObject({ status: 200 });
  });

  it("rejects a delayed request promptly when its signal is aborted", async () => {
    vi.useFakeTimers();
    const baseFetch = vi.fn<typeof fetch>();
    const fetcher = createFaultInjectingFetch(baseFetch, [{ kind: "delay", delayMs: 10_000 }]);
    const controller = new AbortController();
    const request = fetcher(url, { signal: controller.signal });
    const rejection = expect(request).rejects.toMatchObject({ name: "AbortError" });

    controller.abort();

    await rejection;
    expect(baseFetch).not.toHaveBeenCalled();
  });

  it("simulates a network-level fetch failure", async () => {
    const fetcher = createFaultInjectingFetch(vi.fn<typeof fetch>(), [{ kind: "network-error" }]);
    await expect(fetcher(url)).rejects.toBeInstanceOf(TypeError);
  });

  it("returns a raw response body for malformed JSON and HTTP status scenarios", async () => {
    const fetcher = createFaultInjectingFetch(vi.fn<typeof fetch>(), [
      { kind: "response", status: 200, body: "{ definitely not json" },
      { kind: "response", status: 503, body: "server is down", headers: { "retry-after": "2" } }
    ]);

    const malformed = await fetcher(url);
    const unavailable = await fetcher(url);

    expect(malformed.status).toBe(200);
    await expect(malformed.json()).rejects.toThrow();
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("retry-after")).toBe("2");
    await expect(unavailable.text()).resolves.toBe("server is down");
  });
});
