"use client";

import { useState, useEffect } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { useApi } from "@/hooks/useApi";
import { Spinner } from "@/components/ui/spinner";
import { PRODUCT_CATEGORIES, GENDER_TYPES, AVAILABILITY_STATUS } from "@/lib/constants";
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

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    category: "",
    gender: "",
    status: "",
    search: "",
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 12 });
  const { get } = useApi();

  useEffect(() => {
    fetchProducts();
  }, [filters, pagination.page]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.gender) params.append("gender", filters.gender);
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());

      const data = await get(`/products?${params.toString()}`);
      setProducts(data.products || []);
    } catch (err) {
      console.error("[v0] Error fetching products:", err);
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div>
      {/* Page Header */}
      <div className="bg-muted py-12">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground">Shop All Products</h1>
          <p className="text-muted-foreground mt-2">
            Browse our complete collection of clothing, shoes, and accessories
          </p>
        </div>
      </div>

      {/* Filters & Products */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-card rounded-lg border border-border p-6 space-y-6">
              <h3 className="font-semibold text-foreground">Filters</h3>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <Select
                  value={filters.category || "all"}
                  onValueChange={(value) => handleFilterChange("category", value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              {/* Reset Filters */}
              <button
                onClick={() => {
                  setFilters({ category: "", gender: "", status: "", search: "" });
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
              >
                Reset Filters
              </button>
            </div>
          </aside>

          {/* Products Grid */}
          <main className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{error}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found matching your filters.</p>
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
