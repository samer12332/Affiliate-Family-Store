import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { connectDB } from "@/lib/db";
import { Category, Product } from "@/lib/models";
import { AVAILABILITY_STATUS, GENDER_TYPES } from "@/lib/constants";
import Link from "next/link";

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

async function getCategoryData(slug: string): Promise<CategoryData | null> {
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

async function getProducts(categoryName: string, gender: string, status: string, sort: string) {
  const query: Record<string, any> = { category: categoryName };
  if (gender) query.gender = gender;
  if (status) query.availabilityStatus = status;

  const products = await Product.find(query)
    .select("_id name slug price discountPrice images category gender featured onSale availabilityStatus")
    .sort(getSort(sort))
    .limit(60)
    .lean();

  return products.map((product: any) => ({
    _id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    price: Number(product.price || 0),
    discountPrice: product.discountPrice !== undefined ? Number(product.discountPrice) : undefined,
    images: Array.isArray(product.images) && product.images.length > 0 ? [product.images[0]] : [],
    category: product.category,
    gender: product.gender,
    featured: Boolean(product.featured),
    onSale: Boolean(product.onSale),
    availabilityStatus: product.availabilityStatus,
  })) as ProductItem[];
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

  await connectDB();
  const category = await getCategoryData(slug);

  if (!category) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-muted-foreground">Category not found</p>
      </div>
    );
  }

  const products = await getProducts(category.name, genderParam, statusParam, sortParam);

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
                  <Link href={`/categories/${slug}?${new URLSearchParams({ ...(statusParam ? { status: statusParam } : {}), ...(sortParam ? { sort: sortParam } : {}) }).toString()}`}>
                    <Button variant={genderParam ? "outline" : "default"} size="sm">All</Button>
                  </Link>
                  {GENDER_TYPES.map((gender) => {
                    const qs = new URLSearchParams({
                      gender,
                      ...(statusParam ? { status: statusParam } : {}),
                      ...(sortParam ? { sort: sortParam } : {}),
                    }).toString();
                    return (
                      <Link key={gender} href={`/categories/${slug}?${qs}`}>
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
                  <Link href={`/categories/${slug}?${new URLSearchParams({ ...(genderParam ? { gender: genderParam } : {}), ...(sortParam ? { sort: sortParam } : {}) }).toString()}`}>
                    <Button variant={statusParam ? "outline" : "default"} size="sm">All</Button>
                  </Link>
                  {AVAILABILITY_STATUS.map((status) => {
                    const qs = new URLSearchParams({
                      ...(genderParam ? { gender: genderParam } : {}),
                      status,
                      ...(sortParam ? { sort: sortParam } : {}),
                    }).toString();
                    return (
                      <Link key={status} href={`/categories/${slug}?${qs}`}>
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
                    const qs = new URLSearchParams({
                      ...(genderParam ? { gender: genderParam } : {}),
                      ...(statusParam ? { status: statusParam } : {}),
                      sort: value,
                    }).toString();
                    return (
                      <Link key={value} href={`/categories/${slug}?${qs}`}>
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
          </main>
        </div>
      </div>
    </div>
  );
}
