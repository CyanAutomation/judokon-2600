import { describe, expect, it } from "vitest";
import {
  createCardElement,
  createDividerElement,
  createStackElement,
  createTextElement,
} from "./primitives";

describe("reusable DOM primitives", () => {
  it("renders text as literal text and applies its variant class", () => {
    const text = createTextElement(document, "<img src=x onerror=alert(1)>", "caption");

    expect(text.tagName).toBe("P");
    expect(text.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(text.querySelector("img")).toBeNull();
    expect(text.classList.contains("ui-text--caption")).toBe(true);
  });

  it("composes semantic cards and stacks without changing child order", () => {
    const first = document.createElement("span");
    first.textContent = "First";
    const second = document.createElement("span");
    second.textContent = "Second";

    const card = createCardElement(document, [first, second]);
    const stack = createStackElement(document, "column", [card]);

    expect(card.tagName).toBe("ARTICLE");
    expect(card.classList.contains("ui-card")).toBe(true);
    expect(stack.classList.contains("ui-stack--column")).toBe(true);
    expect(Array.from(card.children, (child) => child.textContent)).toEqual(["First", "Second"]);
    expect(stack.firstElementChild).toBe(card);
  });

  it("exposes a vertical divider as a separator with orientation", () => {
    const divider = createDividerElement(document, "vertical");

    expect(divider.getAttribute("role")).toBe("separator");
    expect(divider.getAttribute("aria-orientation")).toBe("vertical");
  });
});
