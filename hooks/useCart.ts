"use client";

import { useState, useEffect } from "react";

export interface CartItem {
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  price: number;
  shippingFee: number;
}

const CART_STORAGE_KEY = "family-store-cart";
const CART_UPDATED_EVENT = "family-store-cart-updated";

const readCartFromStorage = (): CartItem[] => {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) return [];
    const parsed = JSON.parse(savedCart);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[v0] Error parsing cart:", error);
    return [];
  }
};

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize cart from localStorage
  useEffect(() => {
    setCart(readCartFromStorage());
    setIsLoading(false);
  }, []);

  // Keep all hook instances in sync (same tab + cross-tab).
  useEffect(() => {
    const syncFromStorage = () => {
      const nextCart = readCartFromStorage();
      setCart((prevCart) => {
        const prevJson = JSON.stringify(prevCart);
        const nextJson = JSON.stringify(nextCart);
        return prevJson === nextJson ? prevCart : nextCart;
      });
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(CART_UPDATED_EVENT, syncFromStorage);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(CART_UPDATED_EVENT, syncFromStorage);
    };
  }, []);

  // Save cart to localStorage whenever it changes and broadcast update.
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      window.dispatchEvent(new Event(CART_UPDATED_EVENT));
    }
  }, [cart, isLoading]);

  const addItem = (item: CartItem) => {
    setCart((prevCart) => {
      // Check if item already exists
      const existingItem = prevCart.find(
        (i) =>
          i.productId === item.productId &&
          i.selectedColor === item.selectedColor &&
          i.selectedSize === item.selectedSize
      );

      if (existingItem) {
        // Update quantity
        return prevCart.map((i) =>
          i.productId === item.productId &&
          i.selectedColor === item.selectedColor &&
          i.selectedSize === item.selectedSize
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      } else {
        // Add new item
        return [...prevCart, item];
      }
    });
  };

  const removeItem = (productId: string, color: string, size: string) => {
    setCart((prevCart) =>
      prevCart.filter(
        (i) =>
          !(
            i.productId === productId &&
            i.selectedColor === color &&
            i.selectedSize === size
          )
      )
    );
  };

  const updateQuantity = (
    productId: string,
    color: string,
    size: string,
    quantity: number
  ) => {
    if (quantity <= 0) {
      removeItem(productId, color, size);
    } else {
      setCart((prevCart) =>
        prevCart.map((i) =>
          i.productId === productId &&
          i.selectedColor === color &&
          i.selectedSize === size
            ? { ...i, quantity }
            : i
        )
      );
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getShippingTotal = () => {
    return cart.reduce((sum, item) => sum + item.shippingFee * item.quantity, 0);
  };

  const getTotal = () => {
    return getSubtotal() + getShippingTotal();
  };

  return {
    cart,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getSubtotal,
    getShippingTotal,
    getTotal,
  };
};
