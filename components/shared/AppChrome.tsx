"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

const LiveNotificationToast = dynamic(
  () => import("@/components/admin/live-notification-toast").then((mod) => mod.LiveNotificationToast),
  { ssr: false }
);

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin = pathname === "/admin/login";

  if (isAdminRoute) {
    return (
      <>
        {!isAdminLogin && (
          <div
            className="fixed bottom-4 z-[70]"
            style={{ insetInlineEnd: "0.75rem" }}
          >
            <LanguageSwitcher />
          </div>
        )}
        {!isAdminLogin && <LiveNotificationToast />}
        <main className="flex-1">{children}</main>
      </>
    );
  }

  return (
    <>
      <div
        className="fixed bottom-4 z-[70]"
        style={{ insetInlineEnd: "0.75rem" }}
      >
        <LanguageSwitcher />
      </div>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
