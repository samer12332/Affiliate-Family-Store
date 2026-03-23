"use client";

import { Analytics } from "@vercel/analytics/next";
import { useEffect, useState } from "react";

export function DeferredAnalytics() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const scheduleLoad = () => setShouldLoad(true);
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleId = idleWindow.requestIdleCallback(() => scheduleLoad());
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timer = window.setTimeout(scheduleLoad, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return shouldLoad ? <Analytics /> : null;
}
