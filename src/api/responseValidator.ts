import type { Judoka } from "./types";
import { isJudoka } from "./validation";

/**
 * Validates responses from the Budokon API
 */
export class BudokonResponseValidator {
  /**
   * Validates and extracts judoka array from API response
   * @throws Error if response is invalid or doesn't match expected count
   */
  validateJudokaArray(body: unknown, expectedCount: number): Judoka[] {
    const drawn =
      typeof body === "object" && body !== null
        ? (body as { judoka?: unknown }).judoka
        : undefined;

    if (
      !Array.isArray(drawn) ||
      drawn.length !== expectedCount ||
      !drawn.every(isJudoka)
    ) {
      throw new Error("Budokon API returned an invalid response. Try again later.");
    }

    return Object.freeze([...drawn]) as Judoka[];
  }

  /**
   * Handles HTTP error responses from Budokon API
   * @throws Error with appropriate message based on status code
   */
  handleHttpError(status: number, weightClass?: string): never {
    if (status === 409 && weightClass) {
      throw new Error(
        `No compatible ${weightClass} kg pair is available in the current Budokon dataset`
      );
    }
    if (status === 401 || status === 403) {
      throw new Error(`Budokon API access was denied (HTTP ${status}). Try again later.`);
    }
    if (status === 404) {
      throw new Error("Budokon API endpoint is unavailable. Try again later.");
    }
    if (status === 429) {
      throw new Error("Too many draw requests. Wait a moment and try again.");
    }
    if (status === 409) {
      throw new Error("Budokon API could not complete this draw (HTTP 409). Try another draw or division.");
    }
    if (status >= 500) {
      throw new Error(`Budokon API is temporarily unavailable (HTTP ${status}). Try again shortly.`);
    }
    throw new Error(`Budokon draw failed (HTTP ${status}). Try again later.`);
  }
}
