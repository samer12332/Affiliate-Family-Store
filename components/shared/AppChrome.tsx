"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { LiveNotificationToast } from "@/components/admin/live-notification-toast";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin = pathname === "/admin/login";

  if (isAdminRoute) {
    return (
      <>
        <div className="fixed top-3 z-[70]" style={{ insetInlineEnd: "0.75rem" }}>
          <LanguageSwitcher />
        </div>
        {!isAdminLogin && <LiveNotificationToast />}
        <main className="flex-1">{children}</main>
      </>
    );
  }

  return (
    <>
      <div className="fixed top-3 z-[70]" style={{ insetInlineEnd: "0.75rem" }}>
        <LanguageSwitcher />
      </div>
      <LiveNotificationToast />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
