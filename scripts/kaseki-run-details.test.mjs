import { describe, expect, it } from "vitest";
import { sanitizedRunFailureDetail } from "./kaseki-run-details.mjs";

describe("sanitized Kaseki run failure details", () => {
  it("prefers a specific controller reason and removes unsafe markup and line breaks", () => {
    const detail = sanitizedRunFailureDetail({
      status: "failed",
      error: " Validation failed\n| [open](https://example.test) <script>alert(1)</script> "
    });

    expect(detail).toBe("Validation failed open https: example.test script alert 1 script");
    expect(detail).not.toMatch(/[\r\n|<>`#]/);
    expect(detail).not.toContain("[");
    expect(detail).not.toContain("]");
  });

  it("uses the nested failure reason when the controller provides an object", () => {
    expect(sanitizedRunFailureDetail({ result: { error: { message: "Check failed" } } }))
      .toBe("Check failed");
  });

  it("truncates long controller messages", () => {
    expect(sanitizedRunFailureDetail({ message: "x".repeat(500) })).toBe("x".repeat(300));
  });

  it("uses a safe fallback when no useful message is returned", () => {
    expect(sanitizedRunFailureDetail({ status: "failed", error: 42 }))
      .toBe("Controller reported failure without a reason. Inspect the run details.");
  });
});
