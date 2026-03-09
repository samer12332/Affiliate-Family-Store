"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRight } from "lucide-react";
import { Empty } from "@/components/ui/empty";

export default function CartPage() {
  const { cart, removeItem, updateQuantity, getSubtotal, getTotalItems } = useCart();

  if (cart.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Shopping Cart</h1>
        <Empty
          icon="shopping-cart"
          title="Your cart is empty"
          description="Add items to your cart to get started"
          action={
            <Button asChild>
              <Link href="/shop">
                Continue Shopping
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {cart.map((item) => (
              <div
                key={`${item.productId}-${item.selectedColor}-${item.selectedSize}`}
                className="bg-card border border-border rounded-lg p-4 sm:p-6 flex gap-4"
              >
                {/* Image */}
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={item.productImage || "/placeholder.jpg"}
                    alt={item.productName}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.productSlug}`}
                    className="text-lg font-semibold text-foreground hover:text-primary truncate block"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.selectedColor && `Color: ${item.selectedColor}`}
                    {item.selectedColor && item.selectedSize && " • "}
                    {item.selectedSize && `Size: ${item.selectedSize}`}
                  </p>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Quantity */}
                    <div className="flex items-center border border-border rounded-lg w-fit">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.selectedColor,
                            item.selectedSize,
                            item.quantity - 1
                          )
                        }
                        className="px-2 sm:px-3 py-1 hover:bg-muted"
                      >
                        −
                      </button>
                      <span className="px-3 sm:px-4 py-1">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.selectedColor,
                            item.selectedSize,
                            item.quantity + 1
                          )
                        }
                        className="px-2 sm:px-3 py-1 hover:bg-muted"
                      >
                        +
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">
                        {(item.price * item.quantity).toFixed(2)} EGP
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.price.toFixed(2)} EGP each
                      </p>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() =>
                        removeItem(
                          item.productId,
                          item.selectedColor,
                          item.selectedSize
                        )
                      }
                      className="p-2 hover:bg-destructive/10 rounded-lg text-destructive transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link href="/shop" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mt-6">
            <ArrowRight className="w-4 h-4 rotate-180" />
            Continue Shopping
          </Link>
        </div>

        {/* Cart Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-6 sticky top-20 space-y-4">
            <h2 className="text-xl font-bold text-foreground">Order Summary</h2>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({getTotalItems()} items)</span>
                <span className="font-medium text-foreground">{getSubtotal().toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-foreground">To be calculated</span>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-semibold text-lg text-primary">{getSubtotal().toFixed(2)} EGP</span>
            </div>

            <Button asChild size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/checkout">Proceed to Checkout</Link>
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Shipping cost will be calculated at checkout based on your location
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
