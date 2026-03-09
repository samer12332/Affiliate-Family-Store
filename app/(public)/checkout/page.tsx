"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCart } from "@/hooks/useCart";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EGYPTIAN_GOVERNORATES } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Image from "next/image";

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().min(10, "Valid phone number is required"),
  street: z.string().min(1, "Street is required"),
  detailedAddress: z.string().min(3, "Detailed address is required"),
  city: z.string().min(1, "City is required"),
  governorate: z.string().min(1, "Governorate is required"),
  postalCode: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, getSubtotal, getTotalItems, clearCart } = useCart();
  const { post } = useApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGovernorate, setSelectedGovernorate] = useState("");
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  useEffect(() => {
    setValue("governorate", selectedGovernorate, { shouldValidate: true });
  }, [selectedGovernorate, setValue]);

  useEffect(() => {
    const estimateShipping = async () => {
      if (!selectedGovernorate || cart.length === 0) {
        setShippingFee(0);
        setShippingError(null);
        return;
      }

      try {
        setShippingLoading(true);
        setShippingError(null);
        const result = await post("/orders/shipping-estimate", {
          cartItems: cart.map((item) => ({
            productId: item.productId,
            productSlug: item.productSlug,
            productName: item.productName,
            quantity: item.quantity,
          })),
          governorate: selectedGovernorate,
        });
        setShippingFee(Number(result.shippingFee || 0));
      } catch (err) {
        setShippingFee(0);
        setShippingError(err instanceof Error ? err.message : "Failed to calculate shipping");
      } finally {
        setShippingLoading(false);
      }
    };

    estimateShipping();
  }, [selectedGovernorate, cart, post]);

  if (cart.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-muted-foreground">Your cart is empty. Please add items before checking out.</p>
        <Button asChild className="mt-4">
          {/* TODO: Add link to shop */}
          <a href="/shop">Go to Shop</a>
        </Button>
      </div>
    );
  }

  const onSubmit = async (data: CheckoutFormData) => {
    if (!selectedGovernorate) {
      toast.error("Please select a governorate");
      return;
    }
    if (shippingError) {
      toast.error(shippingError);
      return;
    }

    try {
      setIsSubmitting(true);

      const orderData = {
        cartItems: cart.map((item) => ({
          productId: item.productId,
          productSlug: item.productSlug,
          productName: item.productName,
          color: item.selectedColor,
          size: item.selectedSize,
          quantity: item.quantity,
        })),
        customerInfo: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
        },
        shippingAddress: {
          fullName: data.customerName,
          street: data.street,
          detailedAddress: data.detailedAddress,
          city: data.city,
          governorate: selectedGovernorate,
          postalCode: data.postalCode || "",
          phone: data.customerPhone,
        },
      };

      const response = await post("/orders", orderData);

      toast.success("Order created successfully!");
      clearCart();
      router.push(`/order-confirmation/${response.order.id}`);
    } catch (error) {
      console.error("[v0] Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = () => {
    toast.error("Please complete all required checkout fields.");
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Customer Information</h2>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Full Name</label>
              <input
                {...register("customerName")}
                type="text"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="John Doe"
              />
              {errors.customerName && (
                <p className="text-sm text-destructive mt-1">{errors.customerName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Email</label>
                <input
                  {...register("customerEmail")}
                  type="email"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="john@example.com"
                />
                {errors.customerEmail && (
                  <p className="text-sm text-destructive mt-1">{errors.customerEmail.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Phone</label>
                <input
                  {...register("customerPhone")}
                  type="tel"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+20 123 456 7890"
                />
                {errors.customerPhone && (
                  <p className="text-sm text-destructive mt-1">{errors.customerPhone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Shipping Address</h2>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Street Address</label>
              <input
                {...register("street")}
                type="text"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="123 Main Street"
              />
              {errors.street && (
                <p className="text-sm text-destructive mt-1">{errors.street.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Detailed Address</label>
              <textarea
                {...register("detailedAddress")}
                rows={3}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Building, floor, apartment, nearest landmark"
              />
              {errors.detailedAddress && (
                <p className="text-sm text-destructive mt-1">{errors.detailedAddress.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">City</label>
                <input
                  {...register("city")}
                  type="text"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Cairo"
                />
                {errors.city && (
                  <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Postal Code</label>
                <input
                  {...register("postalCode")}
                  type="text"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="11111"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Governorate</label>
              <input type="hidden" {...register("governorate")} />
              <Select value={selectedGovernorate} onValueChange={setSelectedGovernorate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a governorate" />
                </SelectTrigger>
                <SelectContent>
                  {EGYPTIAN_GOVERNORATES.map((gov) => (
                    <SelectItem key={gov} value={gov}>
                      {gov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedGovernorate && errors.governorate && (
                <p className="text-sm text-destructive mt-1">{errors.governorate.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || shippingLoading || !!shippingError || !selectedGovernorate}
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2" />
                Processing...
              </>
            ) : (
              "Place Order"
            )}
          </Button>
        </form>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-6 sticky top-20 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Order Summary</h2>

            {/* Items */}
            <div className="space-y-3 max-h-96 overflow-y-auto border-b border-border pb-4">
              {cart.map((item) => (
                <div key={`${item.productId}-${item.selectedColor}-${item.selectedSize}`} className="flex gap-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <Image
                      src={item.productImage || "/placeholder.jpg"}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    <p className="text-sm font-semibold text-foreground">
                      {(item.price * item.quantity).toFixed(2)} EGP
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{getSubtotal().toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">
                  {!selectedGovernorate
                    ? "Select governorate"
                    : shippingLoading
                      ? "Calculating..."
                      : shippingError
                        ? "Not available"
                        : `${shippingFee.toFixed(2)} EGP`}
                </span>
              </div>
              {shippingError && (
                <p className="text-xs text-destructive">{shippingError}</p>
              )}
            </div>

            <div className="border-t border-border pt-4 flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-semibold text-lg text-primary">
                {(getSubtotal() + shippingFee).toFixed(2)} EGP
              </span>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Final shipping cost will be calculated based on selected items and governorate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
