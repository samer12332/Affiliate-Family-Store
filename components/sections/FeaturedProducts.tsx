"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { Spinner } from "@/components/ui/spinner";
import { useApi } from "@/hooks/useApi";
import { useI18n } from "@/components/i18n/LanguageProvider";

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: string;
  featured: boolean;
  onSale: boolean;
  availabilityStatus: string;
}

export function FeaturedProducts() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { get } = useApi();

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await get("/products?featured=true&limit=8&fieldset=listing");
        setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (err) {
        console.error("[v0] Error fetching featured products:", err);
        setError(t("Unable to load products. Please try again later."));
        setProducts([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, [get]);

  if (loading) {
    return (
      <section className="py-16 sm:py-24 bg-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t("Featured Products")}
            </h2>
          </div>
          <div className="flex justify-center">
            <Spinner />
          </div>
        </div>
      </section>
    );
  }

  if (error || products.length === 0) {
    return (
      <section className="py-16 sm:py-24 bg-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t("Featured Products")}
            </h2>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">{error || t("No featured products available")}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("Featured Products")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("Check out our hand-picked selection of premium products")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              id={product._id}
              slug={product.slug}
              name={product.name}
              price={product.price}
              discountPrice={product.discountPrice}
              image={product.images?.[0] || "/placeholder.jpg"}
              category={product.category}
              featured={product.featured}
              onSale={product.onSale}
              availabilityStatus={product.availabilityStatus}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
