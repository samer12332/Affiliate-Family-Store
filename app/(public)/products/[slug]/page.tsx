"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import { useApi } from "@/hooks/useApi";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ShoppingCart, Heart, Truck, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  colors: Array<{ name: string; hex: string } | string>;
  sizes: string[];
  sizeWeightChart?: Array<{ size: string; minWeightKg: number; maxWeightKg: number }>;
  category: string;
  gender: string;
  brand?: string;
  availabilityStatus: string;
  shippingOptions: Array<{ governorate: string; fee: number; estimatedDays: number }>;
  returnPolicy?: string;
  seoMetadata?: { title?: string; description?: string };
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isFavorited, setIsFavorited] = useState(false);
  const { get } = useApi();
  const { addItem } = useCart();

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await get(`/products/${slug}`);
      const resolvedProduct = data?.product ?? data;
      setProduct(resolvedProduct);

      // Set default selections
      const resolvedColors = Array.isArray(resolvedProduct?.colors)
        ? resolvedProduct.colors.map((color: any) =>
            typeof color === "string" ? { name: color, hex: "#d4d4d8" } : color
          )
        : [];
      const resolvedSizes =
        Array.isArray(resolvedProduct?.sizes) && resolvedProduct.sizes.length > 0
          ? resolvedProduct.sizes
          : Array.isArray(resolvedProduct?.sizeWeightChart)
            ? resolvedProduct.sizeWeightChart.map((entry: any) => entry.size)
            : [];
      if (resolvedColors.length > 0) setSelectedColor(resolvedColors[0].name);
      if (resolvedSizes.length > 0) setSelectedSize(resolvedSizes[0]);
    } catch (err) {
      console.error("[v0] Error fetching product:", err);
      setError("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    const hasColorOptions = normalizedColors.length > 0;
    const resolvedSizes =
      Array.isArray(product?.sizes) && product.sizes.length > 0
        ? product.sizes
        : Array.isArray(product?.sizeWeightChart)
          ? product.sizeWeightChart.map((entry) => entry.size)
          : [];
    const sizeRangeLabelBySize =
      Array.isArray(product?.sizeWeightChart) && product.sizeWeightChart.length > 0
        ? Object.fromEntries(
            product.sizeWeightChart.map((entry) => [
              entry.size,
              `${entry.size} (${entry.minWeightKg}-${entry.maxWeightKg} Kg)`,
            ])
          )
        : ({} as Record<string, string>);
    const hasSizeOptions = resolvedSizes.length > 0;

    if ((hasColorOptions && !selectedColor) || (hasSizeOptions && !selectedSize)) {
      toast.error("Please select required options");
      return;
    }

    const displayPrice = product!.discountPrice || product!.price;

    addItem({
      productId: product!._id,
      productName: product!.name,
      productSlug: product!.slug,
      productImage: product!.images?.[0] || "",
      selectedColor: hasColorOptions ? selectedColor : "Default",
      selectedSize: hasSizeOptions ? (sizeRangeLabelBySize[selectedSize] || selectedSize) : "Default",
      quantity,
      price: displayPrice,
      shippingFee: 0, // Will be calculated at checkout
    });

    toast.success(`${quantity} item(s) added to cart`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-muted-foreground">{error || "Product not found"}</p>
      </div>
    );
  }

  const displayPrice = product.discountPrice || product.price;
  const normalizedColors = Array.isArray(product.colors)
    ? product.colors.map((color) =>
        typeof color === "string" ? { name: color, hex: "#d4d4d8" } : color
      )
    : [];
  const resolvedSizes =
    Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes
      : Array.isArray(product.sizeWeightChart)
        ? product.sizeWeightChart.map((entry) => entry.size)
        : [];
  const sizeRangeLabelBySize =
    Array.isArray(product.sizeWeightChart) && product.sizeWeightChart.length > 0
      ? Object.fromEntries(
          product.sizeWeightChart.map((entry) => [
            entry.size,
            `${entry.size} (${entry.minWeightKg}-${entry.maxWeightKg} Kg)`,
          ])
        )
      : ({} as Record<string, string>);
  const selectedSizeRangeText =
    selectedSize && sizeRangeLabelBySize[selectedSize]
      ? `${selectedSize} is suitable for ${sizeRangeLabelBySize[selectedSize].replace(`${selectedSize} `, "")}`
      : "";
  const discount = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  return (
    <div>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
              <Image
                src={product.images[selectedImage] || "/placeholder.jpg"}
                alt={product.name}
                fill
                className="object-cover"
              />
              {discount > 0 && (
                <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-semibold">
                  -{discount}%
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === idx ? "border-primary" : "border-border"
                    }`}
                  >
                    <Image src={img} alt={`${product.name} ${idx + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">{product.category}</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{product.name}</h1>
              {product.brand && (
                <p className="text-muted-foreground">by {product.brand}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">{displayPrice.toFixed(2)} EGP</span>
              {product.discountPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {product.price.toFixed(2)} EGP
                </span>
              )}
            </div>

            {/* Availability */}
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium w-fit ${
              product.availabilityStatus === "Available"
                ? "bg-green-100 text-green-800"
                : product.availabilityStatus === "Limited Availability"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}>
              {product.availabilityStatus}
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>

            {/* Colors */}
            {normalizedColors.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Color</label>
                <div className="flex gap-3">
                  {normalizedColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                        selectedColor === color.name
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-sm">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Guide by Weight */}
            {Array.isArray(product.sizeWeightChart) && product.sizeWeightChart.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Size Guide by Weight</label>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-foreground">Size</th>
                        <th className="text-left px-3 py-2 font-medium text-foreground">Weight Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.sizeWeightChart.map((entry, idx) => (
                        <tr key={`${entry.size}-${idx}`} className="border-t border-border">
                          <td className="px-3 py-2 text-foreground">{entry.size}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {entry.minWeightKg} - {entry.maxWeightKg} Kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {(!Array.isArray(product.sizeWeightChart) || product.sizeWeightChart.length === 0) &&
              resolvedSizes.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Size weight details are not configured for this product yet.
                </p>
              )}

            {/* Sizes */}
            {resolvedSizes.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Size</label>
                <div className="flex gap-2 flex-wrap">
                  {resolvedSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors text-sm font-medium ${
                        selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {sizeRangeLabelBySize[size] || size}
                    </button>
                  ))}
                </div>
                {selectedSizeRangeText && (
                  <p className="mt-2 text-sm text-muted-foreground">{selectedSizeRangeText}</p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">Quantity:</span>
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 hover:bg-muted"
                >
                  −
                </button>
                <span className="px-4 py-2 text-center w-12">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 hover:bg-muted"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart & Favorite */}
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </Button>
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className="px-6 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isFavorited ? "fill-destructive text-destructive" : "text-foreground"
                  }`}
                />
              </button>
            </div>

            {/* Shipping & Returns */}
            <div className="border-t border-border pt-6 space-y-4">
              <div className="flex gap-3">
                <Truck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Fast Shipping</p>
                  <p className="text-sm text-muted-foreground">Delivery available across Egypt</p>
                </div>
              </div>
              <div className="flex gap-3">
                <RotateCcw className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Easy Returns</p>
                  {product.returnPolicy ? (
                    <p className="text-sm text-muted-foreground">{product.returnPolicy}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Return within 30 days for a full refund</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
