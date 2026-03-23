"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

export function FavoriteToggleButton({ productName }: { productName: string }) {
  const [isFavorited, setIsFavorited] = useState(false);

  return (
    <button
      type="button"
      aria-label={isFavorited ? `Remove ${productName} from favorites` : `Add ${productName} to favorites`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsFavorited((prev) => !prev);
      }}
      className="absolute top-3 right-3 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
    >
      <Heart
        className={`w-5 h-5 transition-colors ${
          isFavorited ? "fill-destructive text-destructive" : "text-foreground"
        }`}
      />
    </button>
  );
}
