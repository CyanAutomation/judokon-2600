export type BudokonFaultScenario =
  | { kind: "delay"; delayMs: number }
  | { kind: "network-error"; message?: string }
  | { kind: "response"; status: number; body: string; headers?: HeadersInit };

export type BudokonFaultPlan = readonly (BudokonFaultScenario | null)[];

function requestSignal(input: RequestInfo | URL, init: RequestInit): AbortSignal | null | undefined {
  return init.signal ?? (input instanceof Request ? input.signal : undefined);
}

function abortedError(): DOMException {
  return new DOMException("The fault-injected request was aborted.", "AbortError");
}

function delayWithSignal(delayMs: number, signal?: AbortSignal | null): Promise<void> {
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    return Promise.reject(new RangeError("Fault delay must be a finite non-negative number."));
  }
  if (signal?.aborted) return Promise.reject(abortedError());
  if (delayMs === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortedError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}

function simulatedResponse(scenario: Extract<BudokonFaultScenario, { kind: "response" }>): Response {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  new Headers(scenario.headers).forEach((value, key) => headers.set(key, value));
  const body = [204, 205, 304].includes(scenario.status) ? null : scenario.body;
  return new Response(body, { status: scenario.status, headers });
}

/**
 * Wrap any fetch-compatible transport with a deterministic, one-scenario-per-request fault plan.
 * `null` passes that request through; requests after the plan is consumed also pass through.
 */
export function createFaultInjectingFetch(
  baseFetch: typeof fetch,
  plan: BudokonFaultPlan = []
): typeof fetch {
  const scenarios = [...plan];
  let requestIndex = 0;

  return async (input, init = {}) => {
    const scenario = scenarios[requestIndex] ?? null;
    requestIndex += 1;
    const signal = requestSignal(input, init);
    if (signal?.aborted) throw abortedError();

    if (!scenario) return baseFetch(input, init);

    switch (scenario.kind) {
      case "delay":
        await delayWithSignal(scenario.delayMs, signal);
        if (signal?.aborted) throw abortedError();
        return baseFetch(input, init);
      case "network-error":
        throw new TypeError(scenario.message ?? "Simulated Budokon connection failure.");
      case "response":
        return simulatedResponse(scenario);
    }
  };
}
