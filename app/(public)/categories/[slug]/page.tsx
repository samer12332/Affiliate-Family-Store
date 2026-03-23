import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { connectDB } from "@/lib/db";
import { Category } from "@/lib/models";
import { AVAILABILITY_STATUS, GENDER_TYPES } from "@/lib/constants";
import { getPublicCategoryProducts } from "@/lib/product-marketplace";
import Link from "next/link";

export const revalidate = 60;

interface ProductItem {
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

const PAGE_SIZE = 24;

interface CategoryData {
  _id?: string;
  name: string;
  slug: string;
  description: string;
  image?: string;
}

const CATEGORY_FALLBACKS: Record<string, CategoryData> = {
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

function getSort(sort: string) {
  switch (sort) {
    case "price":
      return [["price", 1], ["createdAt", -1]] as [string, 1 | -1][];
    case "-price":
      return [["price", -1], ["createdAt", -1]] as [string, 1 | -1][];
    case "name":
      return [["name", 1], ["createdAt", -1]] as [string, 1 | -1][];
    default:
      return [["createdAt", -1]] as [string, 1 | -1][];
  }
}

function buildCategoryHref(slug: string, params: Record<string, string>) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value)
  ).toString();
  return query ? `/categories/${slug}?${query}` : `/categories/${slug}`;
}

async function getCategoryData(slug: string): Promise<CategoryData | null> {
  if (CATEGORY_FALLBACKS[slug]) {
    return CATEGORY_FALLBACKS[slug];
  }

  const category: any = await Category.findOne({ slug }).lean();
  if (category) {
    return {
      _id: category._id?.toString?.(),
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image: category.image || "",
    };
  }

  return CATEGORY_FALLBACKS[slug] ?? null;
}
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const genderParam = String(resolvedSearchParams?.gender || "").trim();
  const statusParam = String(resolvedSearchParams?.status || "").trim();
  const sortParam = String(resolvedSearchParams?.sort || "-createdAt").trim();
  const currentPage = Math.max(Number.parseInt(String(resolvedSearchParams?.page || "1"), 10) || 1, 1);
  const baseQuery = {
    ...(genderParam ? { gender: genderParam } : {}),
    ...(statusParam ? { status: statusParam } : {}),
    ...(sortParam ? { sort: sortParam } : {}),
  };

  await connectDB();
  const category = await getCategoryData(slug);

  if (!category) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-muted-foreground">Category not found</p>
      </div>
    );
  }

  const { products, hasMore } = await getPublicCategoryProducts({
    category: category.name,
    gender: genderParam || undefined,
    status: statusParam || undefined,
    sort: sortParam,
    page: currentPage,
    limit: PAGE_SIZE,
  });

  return (
    <div>
      <div className="bg-muted py-12">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground">{category.name}</h1>
          {category.description && (
            <p className="mt-2 text-muted-foreground">{category.description}</p>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <div className="space-y-6 rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground">Filters</h3>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Gender</label>
                <div className="flex flex-wrap gap-2">
                  <Link href={buildCategoryHref(slug, {
                    ...(statusParam ? { status: statusParam } : {}),
                    ...(sortParam ? { sort: sortParam } : {}),
                  })}>
                    <Button variant={genderParam ? "outline" : "default"} size="sm">All</Button>
                  </Link>
                  {GENDER_TYPES.map((gender) => {
                    const href = buildCategoryHref(slug, {
                      gender,
                      ...(statusParam ? { status: statusParam } : {}),
                      ...(sortParam ? { sort: sortParam } : {}),
                    });
                    return (
                      <Link key={gender} href={href}>
                        <Button variant={genderParam === gender ? "default" : "outline"} size="sm">
                          {gender === "Unisex" ? "Gender Neutral" : gender}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Availability</label>
                <div className="flex flex-wrap gap-2">
                  <Link href={buildCategoryHref(slug, {
                    ...(genderParam ? { gender: genderParam } : {}),
                    ...(sortParam ? { sort: sortParam } : {}),
                  })}>
                    <Button variant={statusParam ? "outline" : "default"} size="sm">All</Button>
                  </Link>
                  {AVAILABILITY_STATUS.map((status) => {
                    const href = buildCategoryHref(slug, {
                      ...(genderParam ? { gender: genderParam } : {}),
                      status,
                      ...(sortParam ? { sort: sortParam } : {}),
                    });
                    return (
                      <Link key={status} href={href}>
                        <Button variant={statusParam === status ? "default" : "outline"} size="sm">
                          {status}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Sort By</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["-createdAt", "Newest"],
                    ["price", "Price: Low to High"],
                    ["-price", "Price: High to Low"],
                    ["name", "Name: A to Z"],
                  ].map(([value, label]) => {
                    const href = buildCategoryHref(slug, {
                      ...(genderParam ? { gender: genderParam } : {}),
                      ...(statusParam ? { status: statusParam } : {}),
                      sort: value,
                    });
                    return (
                      <Link key={value} href={href}>
                        <Button variant={sortParam === value ? "default" : "outline"} size="sm">
                          {label}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3">
            {products.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No products found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

            {products.length > 0 && (
              <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage}
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentPage > 1 && (
                    <Link href={buildCategoryHref(slug, { ...baseQuery, page: String(currentPage - 1) })}>
                      <Button variant="outline">Previous</Button>
                    </Link>
                  )}
                  {hasMore && (
                    <Link href={buildCategoryHref(slug, { ...baseQuery, page: String(currentPage + 1) })}>
                      <Button>Next</Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
