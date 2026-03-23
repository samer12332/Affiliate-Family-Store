import { unstable_cache } from "next/cache";
import { ProductCard } from "@/components/product/ProductCard";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models";
import { LocalizedText } from "@/components/i18n/LocalizedText";

interface ProductItem {
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

const getFeaturedProducts = unstable_cache(
  async (): Promise<ProductItem[]> => {
    await connectDB();
    const products = await Product.find({ featured: true })
      .select("_id name slug price discountPrice category featured onSale availabilityStatus images")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return products.map((product: any) => ({
      _id: String(product._id),
      name: product.name,
      slug: product.slug,
      price: Number(product.price || 0),
      discountPrice: product.discountPrice !== undefined ? Number(product.discountPrice) : undefined,
      images: Array.isArray(product.images) && product.images.length > 0 ? [product.images[0]] : [],
      category: product.category,
      featured: Boolean(product.featured),
      onSale: Boolean(product.onSale),
      availabilityStatus: product.availabilityStatus,
    }));
  },
  ["featured-products"],
  { revalidate: 300 }
);

export async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            <LocalizedText text="Featured Products" />
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            <LocalizedText text="Check out our hand-picked selection of premium products" />
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              <LocalizedText text="No featured products available" />
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </section>
  );
}
