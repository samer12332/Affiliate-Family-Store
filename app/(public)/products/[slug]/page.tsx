import ProductDetailClient, { type ProductDetail } from "@/components/product/ProductDetailClient";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models";
import mongoose from "mongoose";

export const revalidate = 60;
export const dynamicParams = true;

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

async function findProduct(decodedSlug: string) {
  const normalized = decodeURIComponent(decodedSlug || "").trim().toLowerCase();
  let product = await Product.findOne({ slug: normalized }).lean();

  if (!product && mongoose.Types.ObjectId.isValid(normalized)) {
    product = await Product.findById(normalized).lean();
  }

  return product;
}

function shapeProduct(product: any): ProductDetail {
  return {
    _id: String(product._id),
    merchantId: product.merchantId ? String(product.merchantId) : "",
    shippingSystemId: product.shippingSystemId ? String(product.shippingSystemId) : "",
    name: String(product.name || ""),
    slug: String(product.slug || ""),
    description: String(product.description || ""),
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    discountPrice:
      product.discountPrice === undefined || product.discountPrice === null
        ? undefined
        : Number(product.discountPrice),
    images: Array.isArray(product.images) ? product.images.map((img: any) => String(img)) : [],
    colors: Array.isArray(product.colors) ? product.colors : [],
    sizes: Array.isArray(product.sizes) ? product.sizes.map((size: any) => String(size)) : [],
    sizeWeightChart: Array.isArray(product.sizeWeightChart)
      ? product.sizeWeightChart.map((entry: any) => ({
          size: String(entry?.size || ""),
          minWeightKg: Number(entry?.minWeightKg || 0),
          maxWeightKg: Number(entry?.maxWeightKg || 0),
        }))
      : [],
    category: String(product.category || ""),
    gender: String(product.gender || ""),
    brand: product.brand ? String(product.brand) : undefined,
    availabilityStatus: String(product.availabilityStatus || ""),
    returnPolicy: product.returnPolicy ? String(product.returnPolicy) : undefined,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  await connectDB();
  const product = await findProduct(slug);

  if (!product) {
    return <ProductDetailClient initialProduct={null} initialError="Product not found" />;
  }

  return <ProductDetailClient initialProduct={shapeProduct(product)} />;
}

