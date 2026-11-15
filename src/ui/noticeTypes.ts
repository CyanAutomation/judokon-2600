export interface Notice {
  key: string;
  message: string;
  duration: number;
  action?: { label: string; run: () => void };
}

export type NoticeDuration = "normal" | "long" | "manual";

export interface Snackbar {
  show(notice: Notice): void;
  clear(): void;
  setSuspended(value: boolean): void;
  setDuration(value: NoticeDuration): void;
  dispose(): void;
}
