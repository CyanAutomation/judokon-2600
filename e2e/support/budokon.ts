import type { Page, Route } from "@playwright/test";
import { createBudokonSimulatorFetch } from "../../src/dev/budokon-simulator/simulator";

const drawUrl = "https://budokon.scheimann.workers.dev/v1/draw";
const simulateFetch = createBudokonSimulatorFetch();

export interface CatalogueMockOptions {
  shouldAbort?: () => boolean;
}

async function fulfillDraw(route: Route): Promise<void> {
  const request = route.request();
  const postData = request.postData();
  const response = await simulateFetch(request.url(), {
    method: request.method(),
    headers: request.headers(),
    ...(postData === null ? {} : { body: postData })
  });
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
  await page.route(drawUrl, async route => {
    if (options.shouldAbort?.()) {
      await route.abort();
      return;
    }
    await fulfillDraw(route);
  });
}
