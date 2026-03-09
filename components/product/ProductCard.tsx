"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
  category: string;
  featured?: boolean;
  onSale?: boolean;
  availabilityStatus: string;
}

export function ProductCard({
  id,
  slug,
  name,
  price,
  discountPrice,
  image,
  category,
  featured,
  onSale,
  availabilityStatus,
}: ProductCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const displayPrice = discountPrice || price;
  const discount = discountPrice ? Math.round(((price - discountPrice) / price) * 100) : 0;

  return (
    <div className="group flex flex-col h-full bg-card rounded-lg overflow-hidden border border-border hover:shadow-lg transition-all duration-300">
      {/* Image Container */}
      <Link href={`/products/${slug}`} className="relative overflow-hidden bg-muted flex-shrink-0">
        <div className="relative w-full aspect-square">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {featured && (
            <Badge variant="default" className="bg-accent text-accent-foreground">
              Featured
            </Badge>
          )}
          {onSale && (
            <Badge variant="default" className="bg-destructive text-destructive-foreground">
              {discount}% Off
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => setIsFavorited(!isFavorited)}
          className="absolute top-3 right-3 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorited ? "fill-destructive text-destructive" : "text-foreground"
            }`}
          />
        </button>

        {/* Availability Status */}
        <div className="absolute bottom-3 left-3 right-3">
          <span className={`text-xs font-medium px-2 py-1 rounded inline-block ${
            availabilityStatus === "Available"
              ? "bg-green-100 text-green-800"
              : availabilityStatus === "Limited Availability"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }`}>
            {availabilityStatus}
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 gap-3">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">{category}</p>
          <Link href={`/products/${slug}`} className="hover:text-primary transition-colors">
            <h3 className="font-medium text-foreground line-clamp-2 leading-tight">{name}</h3>
          </Link>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-foreground">{displayPrice.toFixed(2)} EGP</span>
          {discountPrice && (
            <span className="text-sm text-muted-foreground line-through">{price.toFixed(2)} EGP</span>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button
          asChild
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
        >
          <Link href={`/products/${slug}`} className="flex items-center justify-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span>View Details</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
