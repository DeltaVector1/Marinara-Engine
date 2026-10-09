import { useEffect, useState } from "react";

/** Refreshes a shared list timestamp on a cadence and when a hidden tab returns. */
export function useClock(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Guard non-DOM environments (tests / any non-browser runtime); the client
    // normally runs in a browser or Tauri webview where `document` exists.
    if (typeof document === "undefined") return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer == null) timer = setInterval(() => setNow(new Date()), intervalMs);
    };
    const stop = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        setNow(new Date()); // catch up immediately on re-show
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs]);

  return now;
}
