"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type UnreadNotificationsState = {
  unreadTotal: number;
  initialized: boolean;
};

let unreadState: UnreadNotificationsState = {
  unreadTotal: 0,
  initialized: false,
};

let inflightRequest: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setUnreadState(partial: Partial<UnreadNotificationsState>) {
  unreadState = { ...unreadState, ...partial };
  emit();
}

export function setUnreadNotificationsCount(unreadTotal: number) {
  setUnreadState({
    unreadTotal: Math.max(0, Number(unreadTotal || 0)),
    initialized: true,
  });
}

export async function fetchUnreadNotificationsCount(token: string) {
  if (!token) {
    setUnreadNotificationsCount(0);
    return;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      const response = await fetch("/api/notifications?unreadCountOnly=true", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const data = await response.json();
      setUnreadNotificationsCount(Number(data?.unreadTotal || 0));
    } catch {
      setUnreadNotificationsCount(0);
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

export function useUnreadNotifications() {
  const { token, isLoading } = useAdminAuth();
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => unreadState,
    () => unreadState
  );

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      setUnreadNotificationsCount(0);
      return;
    }

    if (!snapshot.initialized) {
      void fetchUnreadNotificationsCount(token);
    }
  }, [isLoading, snapshot.initialized, token]);

  return snapshot.unreadTotal;
}
