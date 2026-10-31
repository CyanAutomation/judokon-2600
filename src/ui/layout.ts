/** Reserve mobile setup actions outside the application's scroll region. */
export function layoutSetupActions(root: HTMLElement): void {
  const actions = root.querySelector<HTMLElement>(".setup-actions");
  const home = root.querySelector<HTMLElement>(".setup-action-home");
  if (!actions || !home) return;
  const focused = actions.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
  let dock = root.querySelector<HTMLElement>(".setup-action-dock");
  if (window.innerWidth <= 560) {
    if (!dock) {
      dock = document.createElement("div");
      dock.className = "setup-action-dock";
      root.append(dock);
    }
    if (actions.parentElement !== dock) dock.append(actions);
  } else {
    if (home.nextElementSibling !== actions) home.after(actions);
    dock?.remove();
  }
  if (focused && document.activeElement !== focused) {
    focused.focus({ preventScroll: true });
    focused.scrollIntoView?.({ block: "nearest" });
  }
}
