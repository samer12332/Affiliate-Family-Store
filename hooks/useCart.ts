"use client";

import { useState, useEffect } from "react";

export interface CartItem {
  productId: string;
  merchantId: string;
  shippingSystemId: string;
  merchantName: string;
  productName: string;
  productSlug: string;
  productImage: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  price: number;
  merchantPrice: number;
  salePriceByMarketer: number;
  shippingFee: number;
  availableStock?: number;
}

const CART_STORAGE_KEY_PREFIX = "family-store-cart";
const CART_UPDATED_EVENT = "family-store-cart-updated";
const AUTH_UPDATED_EVENT = "family-store-auth-updated";
const CART_SIGNATURE_SEPARATOR = "|";

const getCurrentCartStorageKey = () => {
  try {
    const savedUser = localStorage.getItem("admin-user");
    if (!savedUser) {
      return `${CART_STORAGE_KEY_PREFIX}:guest`;
    }

    const user = JSON.parse(savedUser);
    const userId = String(user?.id || user?._id || "").trim();
    if (!userId) {
      return `${CART_STORAGE_KEY_PREFIX}:guest`;
    }

    return `${CART_STORAGE_KEY_PREFIX}:${userId}`;
  } catch {
    return `${CART_STORAGE_KEY_PREFIX}:guest`;
  }
};

const readCartFromStorage = (storageKey: string): CartItem[] => {
  try {
    const savedCart = localStorage.getItem(storageKey);
    if (!savedCart) return [];
    const parsed = JSON.parse(savedCart);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      productId: String(item?.productId || ''),
      merchantId: String(item?.merchantId || ''),
      shippingSystemId: String(item?.shippingSystemId || ''),
      merchantName: String(item?.merchantName || ''),
      productName: String(item?.productName || ''),
      productSlug: String(item?.productSlug || ''),
      productImage: String(item?.productImage || ''),
      selectedColor: String(item?.selectedColor || ''),
      selectedSize: String(item?.selectedSize || ''),
      quantity: Math.max(1, Number(item?.quantity || 1)),
      price: Number(item?.price || 0),
      merchantPrice: Number(item?.merchantPrice ?? item?.price ?? 0),
      salePriceByMarketer: Number(item?.salePriceByMarketer ?? item?.price ?? 0),
      shippingFee: Number(item?.shippingFee || 0),
      availableStock:
        item?.availableStock === undefined || item?.availableStock === null
          ? undefined
          : Math.max(0, Number(item.availableStock)),
    })).filter((item) => item.productId);
  } catch (error) {
    console.error("[v0] Error parsing cart:", error);
    return [];
  }
};

const getCartSignature = (entries: CartItem[]) =>
  entries
    .map((entry) =>
      [
        entry.productId,
        entry.merchantId,
        entry.shippingSystemId,
        entry.selectedColor,
        entry.selectedSize,
        entry.quantity,
        entry.salePriceByMarketer,
        entry.price,
      ].join(CART_SIGNATURE_SEPARATOR)
    )
    .join("||");

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartStorageKey, setCartStorageKey] = useState(`${CART_STORAGE_KEY_PREFIX}:guest`);

  // Initialize cart from localStorage
  useEffect(() => {
    const activeKey = getCurrentCartStorageKey();
    setCartStorageKey(activeKey);
    setCart(readCartFromStorage(activeKey));
    setIsLoading(false);
  }, []);

  // Keep all hook instances in sync (same tab + cross-tab).
  useEffect(() => {
    const syncFromStorage = () => {
      const activeKey = getCurrentCartStorageKey();
      setCartStorageKey((prevKey) => (prevKey === activeKey ? prevKey : activeKey));
      const nextCart = readCartFromStorage(activeKey);
      setCart((prevCart) => {
        return getCartSignature(prevCart) === getCartSignature(nextCart) ? prevCart : nextCart;
      });
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(CART_UPDATED_EVENT, syncFromStorage);
    window.addEventListener(AUTH_UPDATED_EVENT, syncFromStorage);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(CART_UPDATED_EVENT, syncFromStorage);
      window.removeEventListener(AUTH_UPDATED_EVENT, syncFromStorage);
    };
  }, []);

  // Save cart to localStorage whenever it changes and broadcast update.
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(cartStorageKey, JSON.stringify(cart));
      window.dispatchEvent(new Event(CART_UPDATED_EVENT));
    }
  }, [cart, cartStorageKey, isLoading]);

  const addItem = (item: CartItem) => {
    const normalizedIncoming = {
      ...item,
      shippingSystemId: String(item?.shippingSystemId || ""),
      availableStock:
        item?.availableStock === undefined || item?.availableStock === null
          ? undefined
          : Math.max(0, Number(item.availableStock)),
    };
    if (cart.length > 0) {
      const cartMerchantId = String(cart[0]?.merchantId || "");
      const cartShippingSystemId = String(cart[0]?.shippingSystemId || "");

      if (cartMerchantId && cartMerchantId !== normalizedIncoming.merchantId) {
        return { ok: false as const, error: "Cart items must belong to the same submerchant." };
      }

      if (cartShippingSystemId && cartShippingSystemId !== normalizedIncoming.shippingSystemId) {
        return { ok: false as const, error: "Cart items must use the same shipping type." };
      }
    }

    if (normalizedIncoming.availableStock !== undefined) {
      const requestedQty = Math.max(1, Number(normalizedIncoming.quantity || 1));
      const existingQtyForProduct = cart
        .filter((entry) => entry.productId === normalizedIncoming.productId)
        .reduce((sum, entry) => sum + Math.max(1, Number(entry.quantity || 1)), 0);
      const totalQtyAfterAdd = existingQtyForProduct + requestedQty;

      if (totalQtyAfterAdd > normalizedIncoming.availableStock) {
        return {
          ok: false as const,
          error: `Only ${normalizedIncoming.availableStock} item(s) available in stock.`,
        };
      }
    }

    setCart((prevCart) => {
      // Check if item already exists
      const existingItem = prevCart.find(
        (i) =>
          i.productId === normalizedIncoming.productId &&
          i.selectedColor === normalizedIncoming.selectedColor &&
          i.selectedSize === normalizedIncoming.selectedSize
      );

      if (existingItem) {
        // Update quantity
        return prevCart.map((i) =>
          i.productId === normalizedIncoming.productId &&
          i.selectedColor === normalizedIncoming.selectedColor &&
          i.selectedSize === normalizedIncoming.selectedSize
            ? {
                ...i,
                quantity: i.quantity + normalizedIncoming.quantity,
                availableStock:
                  normalizedIncoming.availableStock === undefined
                    ? i.availableStock
                    : normalizedIncoming.availableStock,
              }
            : i
        );
      } else {
        // Add new item
        return [...prevCart, normalizedIncoming];
      }
    });

    return { ok: true as const };
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
      const targetItem = cart.find(
        (entry) =>
          entry.productId === productId &&
          entry.selectedColor === color &&
          entry.selectedSize === size
      );
      const availableStock = targetItem?.availableStock;
      const normalizedQty = Math.max(1, Number(quantity || 1));
      if (availableStock !== undefined && normalizedQty > availableStock) {
        return {
          ok: false as const,
          error: `Only ${availableStock} item(s) available in stock.`,
        };
      }

      setCart((prevCart) =>
        prevCart.map((i) =>
          i.productId === productId &&
          i.selectedColor === color &&
          i.selectedSize === size
            ? { ...i, quantity: normalizedQty }
            : i
        )
      );
      return { ok: true as const };
    }
    return { ok: true as const };
  };

  const updateSalePrice = (
    productId: string,
    color: string,
    size: string,
    salePriceByMarketer: number
  ) => {
    const normalizedSalePrice = Number(salePriceByMarketer || 0);

    setCart((prevCart) =>
      prevCart.map((i) =>
        i.productId === productId &&
        i.selectedColor === color &&
        i.selectedSize === size
          ? { ...i, salePriceByMarketer: normalizedSalePrice, price: normalizedSalePrice }
          : i
      )
    );
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
    updateSalePrice,
    clearCart,
    getTotalItems,
    getSubtotal,
    getShippingTotal,
    getTotal,
  };
};
