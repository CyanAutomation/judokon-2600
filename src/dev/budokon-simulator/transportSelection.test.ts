import { describe, expect, it } from "vitest";
import { budokonTransportFor } from "./transportSelection";

describe("Budokon transport selection", () => {
  it("uses the simulator only for an explicitly selected development mode", () => {
    expect(budokonTransportFor("serve", "simulator")).toBe("simulator");
    expect(budokonTransportFor("serve", "development")).toBe("live");
    expect(budokonTransportFor("build", "simulator")).toBe("live");
    expect(budokonTransportFor("build", "production")).toBe("live");
  });
});
