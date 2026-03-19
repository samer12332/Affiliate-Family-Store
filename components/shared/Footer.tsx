"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { SiteLogo } from "@/components/shared/SiteLogo";
import { useI18n } from "@/components/i18n/LanguageProvider";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-secondary text-secondary-foreground py-12 mt-16">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <SiteLogo compact />
            </div>
            <p className="text-sm opacity-70">
              {t("Your trusted source for quality clothing, shoes, and accessories for the whole family.")}
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold mb-4">{t("Shop")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/shop" className="hover:opacity-100 opacity-70 transition-opacity">
                  {t("All Products")}
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/clothes"
                  className="hover:opacity-100 opacity-70 transition-opacity"
                >
                  {t("Clothes")}
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/shoes"
                  className="hover:opacity-100 opacity-70 transition-opacity"
                >
                  {t("Shoes")}
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/others"
                  className="hover:opacity-100 opacity-70 transition-opacity"
                >
                  {t("Accessories")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">{t("Support")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:opacity-100 opacity-70 transition-opacity">
                  {t("About Us")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:opacity-100 opacity-70 transition-opacity">
                  {t("Contact")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:opacity-100 opacity-70 transition-opacity">
                  {t("FAQ")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">{t("Contact")}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>+20 (0) 123-456-7890</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>info@familystore.local</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Cairo, Egypt</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-secondary-foreground/20 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <p>&copy; 2024 FamilyStore. {t("All rights reserved.")}</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:opacity-100 opacity-70 transition-opacity">
              {t("Privacy Policy")}
            </Link>
            <Link href="#" className="hover:opacity-100 opacity-70 transition-opacity">
              {t("Terms of Service")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
