"use client";

import { use, useState, useEffect } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { useApi } from "@/hooks/useApi";
import { Spinner } from "@/components/ui/spinner";
import { GENDER_TYPES, AVAILABILITY_STATUS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: string;
  gender: string;
  featured: boolean;
  onSale: boolean;
  availabilityStatus: string;
}

interface Category {
  _id?: string;
  name: string;
  slug: string;
  description: string;
  image?: string;
}

const CATEGORY_FALLBACKS: Record<string, Category> = {
  clothes: {
    name: "Clothes",
    slug: "clothes",
    description: "Browse our clothing collection.",
  },
  shoes: {
    name: "Shoes",
    slug: "shoes",
    description: "Browse our shoes collection.",
  },
  others: {
    name: "Others",
    slug: "others",
    description: "Browse our accessories and other products.",
  },
  accessories: {
    name: "Others",
    slug: "accessories",
    description: "Browse our accessories and other products.",
  },
};

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    gender: "",
    status: "",
    sort: "-createdAt",
  });
  const { get } = useApi();

  useEffect(() => {
    fetchCategoryAndProducts();
  }, [slug, filters]);

  const fetchCategoryAndProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch category from API, but fall back to known slugs when DB category docs don't exist.
      let resolvedCategory: Category | null = null;
      try {
        const categoryData = await get(`/categories/${slug}`);
        resolvedCategory = categoryData?.category ?? categoryData;
      } catch {
        resolvedCategory = CATEGORY_FALLBACKS[slug] ?? null;
      }

      if (!resolvedCategory) {
        setCategory(null);
        setProducts([]);
        setError("Category not found");
        return;
      }

      setCategory(resolvedCategory);

      // Fetch products for this category
      const productParams = new URLSearchParams();
      productParams.append("category", resolvedCategory.name);
      if (filters.gender) productParams.append("gender", filters.gender);
      if (filters.status) productParams.append("status", filters.status);
      productParams.append("sort", filters.sort);
      productParams.append("fieldset", "listing");

      const productsData = await get(`/products?${productParams.toString()}`);
      setProducts(productsData.products || []);
    } catch (err) {
      console.error("[v0] Error fetching category:", err);
      setError("Failed to load category");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-muted-foreground">{error || "Category not found"}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Category Header */}
      <div className="bg-muted py-12">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground mt-2">{category.description}</p>
          )}
        </div>
      </div>

      {/* Filters & Products */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-card rounded-lg border border-border p-6 space-y-6">
              <h3 className="font-semibold text-foreground">Filters</h3>

              {/* Gender Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Gender</label>
                <Select
                  value={filters.gender || "all"}
                  onValueChange={(value) => handleFilterChange("gender", value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Genders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    {GENDER_TYPES.map((gender) => (
                      <SelectItem key={gender} value={gender}>
                        {gender === "Unisex" ? "Gender Neutral" : gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Availability Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Availability</label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => handleFilterChange("status", value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Availability</SelectItem>
                    {AVAILABILITY_STATUS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Sort By</label>
                <Select value={filters.sort} onValueChange={(value) => handleFilterChange("sort", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Newest" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-createdAt">Newest</SelectItem>
                    <SelectItem value="price">Price: Low to High</SelectItem>
                    <SelectItem value="-price">Price: High to Low</SelectItem>
                    <SelectItem value="name">Name: A to Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filters */}
              <button
                onClick={() => setFilters({ gender: "", status: "", sort: "-createdAt" })}
                className="w-full px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
              >
                Reset Filters
              </button>
            </div>
          </aside>

          {/* Products Grid */}
          <main className="lg:col-span-3">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
          </main>
        </div>
      </div>
    </div>
  );
}
