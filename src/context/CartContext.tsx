import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { products as allProducts } from "@/lib/data";

export interface CartItem {
  productId: string;
  qty: number;
}

interface CartContextValue {
  cart: Record<string, number>;
  totalItems: number;
  totalPrice: number;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue>({
  cart: {},
  totalItems: 0,
  totalPrice: 0,
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
});

const STORAGE_KEY = "aquapure_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* quota exceeded — ignore */
    }
  }, [cart]);

  const addToCart = (id: string) => setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));

  const removeFromCart = (id: string) =>
    setCart((prev) => {
      const c = { ...prev };
      if (c[id] > 1) c[id]--;
      else delete c[id];
      return c;
    });

  const clearCart = () => setCart({});

  const totalItems = Object.values(cart).reduce((s, q) => s + q, 0);
  const totalPrice = Object.entries(cart).reduce((s, [id, qty]) => {
    const p = allProducts.find((p) => p.id === id);
    return s + (p ? p.price * qty : 0);
  }, 0);

  return (
    <CartContext.Provider
      value={{ cart, totalItems, totalPrice, addToCart, removeFromCart, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
