export type StackDirection = "column" | "row";
export type TextVariant = "body" | "caption";
export type DividerAxis = "horizontal" | "vertical";

export function createStackElement(
  doc: Document,
  direction: StackDirection,
  children: readonly Node[]
): HTMLDivElement {
  const stack = doc.createElement("div");
  stack.classList.add("ui-stack", `ui-stack--${direction}`);
  stack.replaceChildren(...children);
  return stack;
}

export function createCardElement(doc: Document, children: readonly Node[]): HTMLElement {
  const card = doc.createElement("article");
  card.classList.add("ui-card");
  card.replaceChildren(...children);
  return card;
}

export function createTextElement(
  doc: Document,
  content: string,
  variant: TextVariant = "body"
): HTMLParagraphElement {
  const text = doc.createElement("p");
  text.classList.add("ui-text", `ui-text--${variant}`);
  text.textContent = content;
  return text;
}

export function createDividerElement(doc: Document, axis: DividerAxis = "horizontal"): HTMLElement {
  if (axis === "horizontal") {
    const divider = doc.createElement("hr");
    divider.classList.add("ui-divider", "ui-divider--horizontal");
    return divider;
  }

  const divider = doc.createElement("div");
  divider.classList.add("ui-divider", "ui-divider--vertical");
  divider.setAttribute("role", "separator");
  divider.setAttribute("aria-orientation", "vertical");
  return divider;
}

