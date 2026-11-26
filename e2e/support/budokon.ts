import type { Page, Route } from "@playwright/test";
import { createBudokonSimulatorFetch } from "../../src/dev/budokon-simulator/simulator";
import { createFaultInjectingFetch, type BudokonFaultPlan } from "../../src/dev/budokon-simulator/faultInjection";

const drawUrl = "https://budokon.scheimann.workers.dev/v1/draw";
const simulateFetch = createBudokonSimulatorFetch();

export interface CatalogueMockOptions {
  shouldAbort?: () => boolean;
  scenarios?: BudokonFaultPlan;
}

async function fulfillDraw(route: Route, fetcher: typeof fetch): Promise<void> {
  const request = route.request();
  const postData = request.postData();
  let response: Response;
  try {
    response = await fetcher(request.url(), {
      method: request.method(),
      headers: request.headers(),
      ...(postData === null ? {} : { body: postData })
    });
  } catch {
    await route.abort();
    return;
  }
  const headers = Object.fromEntries(response.headers.entries());
  Object.assign(headers, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type"
  });

  await route.fulfill({
    status: response.status,
    headers,
    body: response.status === 204 ? undefined : await response.text()
  });
}

/** Use the same fixture catalogue and response logic as simulator mode. */
export async function mockBudokonDraw(page: Page, options: CatalogueMockOptions = {}): Promise<void> {
  const fetcher = createFaultInjectingFetch(simulateFetch, options.scenarios);
  await page.route(drawUrl, async route => {
    if (options.shouldAbort?.()) {
      await route.abort();
      return;
    }
    // Preflight requests do not consume the per-draw fault plan.
    await fulfillDraw(route, route.request().method() === "POST" ? fetcher : simulateFetch);
  });
}
