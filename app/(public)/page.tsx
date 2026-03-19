import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FeaturedProducts } from "@/components/sections/FeaturedProducts";
import { ArrowRight } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";

export const metadata: Metadata = {
  title: "FamilyStore - Quality Clothing & Accessories",
  description:
    "Shop the best selection of clothing, shoes, and accessories for the whole family. Fast delivery across Egypt.",
  keywords: "clothing, shoes, accessories, family, egypt, online shopping",
  openGraph: {
    title: "FamilyStore - Quality Clothing & Accessories",
    description: "Shop quality products for the whole family",
    type: "website",
  },
};

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-background via-muted to-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance mb-4">
                  <LocalizedText text="Quality Clothing & Accessories for Your Family" />
                </h1>
                <p className="text-lg text-muted-foreground text-pretty">
                  <LocalizedText text="Discover our curated collection of stylish and comfortable clothing, shoes, and accessories for men, women, and children." />
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Link href="/shop">
                    <LocalizedText text="Shop Now" />
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Link href="/about"><LocalizedText text="Learn More" /></Link>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                <div>
                  <p className="text-2xl font-bold text-primary">1000+</p>
                  <p className="text-sm text-muted-foreground"><LocalizedText text="Products" /></p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">24/7</p>
                  <p className="text-sm text-muted-foreground"><LocalizedText text="Support" /></p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">Fast</p>
                  <p className="text-sm text-muted-foreground"><LocalizedText text="Fast Delivery" /></p>
                </div>
              </div>
            </div>

            {/* Hero Image Placeholder */}
            <div className="hidden md:flex items-center justify-center">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-accent to-primary/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm mx-auto mb-4"></div>
                    <p className="text-white/60"><LocalizedText text="Featured Products" /></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 sm:py-24 bg-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              <LocalizedText text="Shop by Category" />
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              <LocalizedText text="Browse our wide selection of products across different categories" />
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {["Clothes", "Shoes", "Accessories"].map((category, i) => (
              <Link
                key={category}
                href={`/categories/${category.toLowerCase()}`}
                className="group relative overflow-hidden rounded-2xl aspect-square bg-gradient-to-br from-muted to-background border border-border hover:border-primary transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                  <h3 className="text-2xl font-bold text-foreground"><LocalizedText text={category} /></h3>
                  <p className="text-sm text-muted-foreground"><LocalizedText text="Browse Collection" /></p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <FeaturedProducts />

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-accent text-accent-foreground">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4"><LocalizedText text="Special Offers" /></h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            <LocalizedText text="Subscribe to our newsletter and get exclusive deals, new arrivals, and special offers delivered to your inbox." />
          </p>
          <Button
            asChild
            size="lg"
            className="bg-accent-foreground text-accent hover:bg-accent-foreground/90"
          >
            <Link href="/contact"><LocalizedText text="Get in Touch" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
