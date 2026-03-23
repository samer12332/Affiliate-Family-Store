"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Heart, Truck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { resolveColorHex } from "@/lib/color-swatches";

const HERO_IMAGE_SIZES = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 600px";
const THUMB_IMAGE_SIZES = "(max-width: 768px) 20vw, 120px";

export interface ProductDetail {
  _id: string;
  merchantId?: string;
  shippingSystemId?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock?: number;
  discountPrice?: number;
  images: string[];
  colors: Array<{ name: string; hex: string } | string>;
  sizes: string[];
  sizeWeightChart?: Array<{ size: string; minWeightKg: number; maxWeightKg: number }>;
  category: string;
  gender: string;
  brand?: string;
  availabilityStatus: string;
  returnPolicy?: string;
}

export default function ProductDetailClient({
  initialProduct,
  initialError,
}: {
  initialProduct: ProductDetail | null;
  initialError?: string;
}) {
  const product = initialProduct;
  const error = initialError || null;
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isFavorited, setIsFavorited] = useState(false);
  const { addItem } = useCart();

  const availableStock = useMemo(() => Math.max(0, Number(product?.stock || 0)), [product?.stock]);
  const normalizedColors = useMemo(
    () =>
      Array.isArray(product?.colors)
        ? product.colors.map((color) =>
            typeof color === "string" ? { name: color, hex: resolveColorHex(color) } : color
          )
        : [],
    [product?.colors]
  );
  const resolvedSizes = useMemo(
    () =>
      Array.isArray(product?.sizes) && product.sizes.length > 0
        ? product.sizes
        : Array.isArray(product?.sizeWeightChart)
          ? product.sizeWeightChart.map((entry) => entry.size)
          : [],
    [product?.sizes, product?.sizeWeightChart]
  );
  const sizeRangeLabelBySize = useMemo(
    () =>
      Array.isArray(product?.sizeWeightChart) && product.sizeWeightChart.length > 0
        ? Object.fromEntries(
            product.sizeWeightChart.map((entry) => [
              entry.size,
              `${entry.size} (${entry.minWeightKg}-${entry.maxWeightKg} Kg)`,
            ])
          )
        : ({} as Record<string, string>),
    [product?.sizeWeightChart]
  );
  const displayPrice = useMemo(
    () => Number(product?.discountPrice || product?.price || 0),
    [product?.discountPrice, product?.price]
  );
  const discount = useMemo(
    () =>
      product?.discountPrice
        ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
        : 0,
    [product?.discountPrice, product?.price]
  );

  useEffect(() => {
    if (!product) {
      return;
    }

    if (normalizedColors.length > 0) {
      setSelectedColor(normalizedColors[0].name);
    }

    if (resolvedSizes.length > 0) {
      setSelectedSize(resolvedSizes[0]);
    }
  }, [product, normalizedColors, resolvedSizes]);

  const handleAddToCart = () => {
    if (!product) {
      return;
    }

    if (availableStock < 1) {
      toast.error("This product is out of stock");
      return;
    }
    if (quantity > availableStock) {
      toast.error(`Only ${availableStock} item(s) available in stock`);
      return;
    }

    const hasColorOptions = normalizedColors.length > 0;
    const hasSizeOptions = resolvedSizes.length > 0;

    if ((hasColorOptions && !selectedColor) || (hasSizeOptions && !selectedSize)) {
      toast.error("Please select required options");
      return;
    }

    const baseMerchantPrice = Number(product.price || 0);
    const initialSalePrice = Math.max(displayPrice, baseMerchantPrice);

    const result = addItem({
      productId: product._id,
      merchantId: String(product.merchantId || ""),
      shippingSystemId: String(product.shippingSystemId || ""),
      merchantName: product.brand || "Merchant",
      productName: product.name,
      productSlug: product.slug,
      productImage: product.images?.[0] || "",
      selectedColor: hasColorOptions ? selectedColor : "Default",
      selectedSize: hasSizeOptions ? (sizeRangeLabelBySize[selectedSize] || selectedSize) : "Default",
      quantity,
      price: initialSalePrice,
      merchantPrice: baseMerchantPrice,
      salePriceByMarketer: initialSalePrice,
      shippingFee: 0,
      availableStock,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`${quantity} item(s) added to cart`);
  };

  if (error || !product) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-muted-foreground">{error || "Product not found"}</p>
      </div>
    );
  }

  const selectedSizeRangeText =
    selectedSize && sizeRangeLabelBySize[selectedSize]
      ? `${selectedSize} is suitable for ${sizeRangeLabelBySize[selectedSize].replace(`${selectedSize} `, "")}`
      : "";

  return (
    <div>
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <div className="relative w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={product.images[selectedImage] || "/placeholder.jpg"}
                alt={product.name}
                width={1200}
                height={1200}
                className="aspect-square h-auto w-full object-cover"
                sizes={HERO_IMAGE_SIZES}
                priority={selectedImage === 0}
                loading={selectedImage === 0 ? "eager" : "lazy"}
                fetchPriority={selectedImage === 0 ? "high" : "auto"}
              />
              {discount > 0 && (
                <div className="absolute top-4 right-4 rounded-full bg-destructive px-3 py-1 text-sm font-semibold text-destructive-foreground">
                  -{discount}%
                </div>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`overflow-hidden rounded-lg border-2 transition-colors ${
                      selectedImage === idx ? "border-primary" : "border-border"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      width={160}
                      height={160}
                      className="aspect-square h-auto w-full object-cover"
                      sizes={THUMB_IMAGE_SIZES}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">{product.category}</p>
              <h1 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">{product.name}</h1>
              {product.brand && <p className="text-muted-foreground">by {product.brand}</p>}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">{displayPrice.toFixed(2)} EGP</span>
              {product.discountPrice && (
                <span className="text-lg text-muted-foreground line-through">{product.price.toFixed(2)} EGP</span>
              )}
            </div>

            <div
              className={`inline-block w-fit rounded-full px-3 py-1 text-sm font-medium ${
                product.availabilityStatus === "Available"
                  ? "bg-green-100 text-green-800"
                  : product.availabilityStatus === "Limited Availability"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {product.availabilityStatus}
            </div>

            <p className="leading-relaxed text-muted-foreground">{product.description}</p>

            {normalizedColors.length > 0 && (
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">Color</label>
                <div className="flex gap-3">
                  {normalizedColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 transition-colors ${
                        selectedColor === color.name
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="h-6 w-6 rounded-full border border-gray-300" style={{ backgroundColor: color.hex }} />
                      <span className="text-sm">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(product.sizeWeightChart) && product.sizeWeightChart.length > 0 && (
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">Size Guide by Weight</label>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-foreground">Size</th>
                        <th className="px-3 py-2 text-left font-medium text-foreground">Weight Range</th>
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
              resolvedSizes.length > 0 &&
              product.category !== "Shoes" && (
                <p className="text-sm text-muted-foreground">Size weight details are not configured for this product yet.</p>
              )}

            {resolvedSizes.length > 0 && (
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">Size</label>
                <div className="flex flex-wrap gap-2">
                  {resolvedSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                        selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {sizeRangeLabelBySize[size] || size}
                    </button>
                  ))}
                </div>
                {selectedSizeRangeText && <p className="mt-2 text-sm text-muted-foreground">{selectedSizeRangeText}</p>}
              </div>
            )}

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">Quantity:</span>
              <div className="flex items-center rounded-lg border border-border">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 hover:bg-muted">
                  -
                </button>
                <span className="w-12 px-4 py-2 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(Math.max(1, availableStock), quantity + 1))}
                  className="px-3 py-2 hover:bg-muted"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-muted-foreground">In stock: {availableStock}</span>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={availableStock < 1}
                className="flex flex-1 items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </Button>
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className="rounded-lg border border-border px-6 transition-colors hover:bg-muted"
              >
                <Heart className={`h-5 w-5 ${isFavorited ? "fill-destructive text-destructive" : "text-foreground"}`} />
              </button>
            </div>

            <div className="space-y-4 border-t border-border pt-6">
              <div className="flex gap-3">
                <Truck className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Fast Shipping</p>
                  <p className="text-sm text-muted-foreground">Delivery available across Egypt</p>
                </div>
              </div>
              <div className="flex gap-3">
                <RotateCcw className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
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
