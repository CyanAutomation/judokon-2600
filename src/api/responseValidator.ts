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
      throw new Error("Budokon returned an invalid judoka draw");
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
    throw new Error(`Budokon draw failed (${status})`);
  }
}
