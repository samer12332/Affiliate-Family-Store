"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, Menu, X, Search, Bell } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { cn } from "@/lib/utils";
import { SiteLogo } from "@/components/shared/SiteLogo";
import { useI18n } from "@/components/i18n/LanguageProvider";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { getTotalItems } = useCart();
  const { admin, token, isLoading, logout } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const isMarketerLoggedIn = !isLoading && !!token && admin?.role === "marketer";
  const unreadNotifications = useUnreadNotifications();

  const navLinks = [
    { href: "/shop", label: t("Shop") },
    { href: "/categories/clothes", label: t("Clothes") },
    { href: "/categories/shoes", label: t("Shoes") },
    { href: "/about", label: t("About") },
    { href: "/contact", label: t("Contact") },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b border-border">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <SiteLogo />

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "transition-colors",
                  isActive(link.href)
                    ? "text-primary font-semibold"
                    : "text-foreground hover:text-primary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {isMarketerLoggedIn && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/admin/login");
                }}
                className="hidden sm:inline-flex rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
              >
                {t("Logout")}
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push("/shop?focusSearch=1")}
              aria-label={t("Search products")}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Search className="w-5 h-5 text-foreground" />
            </button>
            {isMarketerLoggedIn && (
              <Link href="/admin/notifications" className="relative p-2" aria-label={t("Notifications")}>
                <Bell className="w-5 h-5 text-foreground" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Link>
            )}
            <Link href="/cart" className="relative p-2">
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {getTotalItems() > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-border py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "block transition-colors py-2",
                  isActive(link.href)
                    ? "text-primary font-semibold"
                    : "text-foreground hover:text-primary"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isMarketerLoggedIn && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                  router.push("/admin/login");
                }}
                className="block w-full rounded-lg border border-border px-3 py-2 text-left text-foreground transition-colors hover:bg-muted"
              >
                {t("Logout")}
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

