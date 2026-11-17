/** Announces visible status changes once through the persistent live region. */
export function createStatusAnnouncer(announce: (message: string) => void, initialMessage = ""): (message: string) => void {
  let previousMessage = initialMessage;
  return message => {
    if (message === previousMessage) return;
    previousMessage = message;
    announce(message);
  };
}
