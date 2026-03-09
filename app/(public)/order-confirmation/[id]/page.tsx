"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, Package, MapPin, Phone, Mail } from "lucide-react";

interface OrderItem {
  productId: string;
  productName: string;
  productSlug: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  unitPrice: number;
  productImage: string;
  shippingFee: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    street: string;
    detailedAddress?: string;
    city: string;
    governorate: string;
    postalCode: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: string;
  createdAt: string;
}

export default function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { get } = useApi();

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      // Note: This assumes there's a public endpoint to get order by ID
      // You may need to create this endpoint or use a different approach
      const data = await get(`/orders/${id}`);
      const resolvedOrder = data?.order ?? data;
      setOrder(resolvedOrder);
    } catch (err) {
      console.error("[v0] Error fetching order:", err);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-muted-foreground">{error || "Order not found"}</p>
      </div>
    );
  }

  return (
    <div className="bg-muted py-12 min-h-screen">
      <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        <div className="bg-card border border-border rounded-lg p-8 text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-green-100 rounded-full blur"></div>
              <CheckCircle className="w-20 h-20 text-green-600 relative" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for your purchase. Your order has been successfully placed.
          </p>

          <div className="bg-muted p-4 rounded-lg inline-block">
            <p className="text-sm text-muted-foreground">Order Number</p>
            <p className="text-2xl font-bold text-primary">{order.orderNumber}</p>
          </div>
        </div>

        {/* Order Details */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Customer Information</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-foreground">
                    {order.customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium text-foreground">{order.customer.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{order.customer.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium text-foreground">{order.customer.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Shipping Address
            </h2>
            <p className="text-muted-foreground text-sm">{order.shippingAddress.street}</p>
            {order.shippingAddress.detailedAddress && (
              <p className="text-muted-foreground text-sm">{order.shippingAddress.detailedAddress}</p>
            )}
            <p className="text-muted-foreground text-sm">
              {order.shippingAddress.city}, {order.shippingAddress.governorate}
            </p>
            {order.shippingAddress.postalCode && (
              <p className="text-muted-foreground text-sm">{order.shippingAddress.postalCode}</p>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Order Items
            </h2>

            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="border-b border-border last:border-0 pb-4 last:pb-0">
                  <div className="flex gap-4">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <Image
                        src={item.productImage || "/placeholder.jpg"}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.selectedColor && `Color: ${item.selectedColor}`}
                        {item.selectedColor && item.selectedSize && " • "}
                        {item.selectedSize && `Size: ${item.selectedSize}`}
                      </p>

                      <div className="flex justify-between items-end mt-2">
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        <p className="font-semibold text-foreground">
                          {(item.unitPrice * item.quantity).toFixed(2)} EGP
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Order Summary</h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">{order.subtotal.toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-foreground">
                  {order.shippingFee.toFixed(2)} EGP
                </span>
              </div>

              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-semibold text-lg text-primary">
                  {order.total.toFixed(2)} EGP
                </span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-sm text-blue-800">
              <strong>Status:</strong> {order.status}
            </p>
            <p className="text-sm text-blue-700 mt-2">
              Your order has been received and is being processed. We'll send you a confirmation email shortly.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/shop">Continue Shopping</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
