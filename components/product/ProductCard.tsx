import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { FavoriteToggleButton } from "@/components/product/FavoriteToggleButton";

interface ProductCardProps {
  slug: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
  category: string;
  featured?: boolean;
  onSale?: boolean;
  availabilityStatus: string;
  imagePriority?: boolean;
}

export function ProductCard({
  slug,
  name,
  price,
  discountPrice,
  image,
  category,
  featured,
  onSale,
  availabilityStatus,
  imagePriority = false,
}: ProductCardProps) {
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
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
            quality={70}
            priority={imagePriority}
          />
        </div>

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1 sm:left-3 sm:top-3 sm:gap-2">
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
        <FavoriteToggleButton productName={name} />

        {/* Availability Status */}
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3">
          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:py-1 sm:text-xs ${
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
      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:gap-3 sm:p-4">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">{category}</p>
          <Link href={`/products/${slug}`} className="hover:text-primary transition-colors">
            <h3 className="line-clamp-2 text-sm font-medium leading-tight text-foreground sm:text-base">{name}</h3>
          </Link>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground sm:text-lg">{displayPrice.toFixed(2)} EGP</span>
          {discountPrice && (
            <span className="text-xs text-muted-foreground line-through sm:text-sm">{price.toFixed(2)} EGP</span>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button
          asChild
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
        >
          <Link href={`/products/${slug}`} className="flex items-center justify-center gap-2">
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">View Details</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
