"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { LiveNotificationToast } from "@/components/admin/live-notification-toast";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin = pathname === "/admin/login";

  if (isAdminRoute) {
    return (
      <>
        {!isAdminLogin && <LiveNotificationToast />}
        <main className="flex-1">{children}</main>
      </>
    );
  }

  return (
    <>
      <LiveNotificationToast />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
