import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
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
  const [cart, setCart] = useState<Record<string, number>>({});

  // Load from localStorage after hydration (avoids SSR/client mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCart(JSON.parse(stored));
    } catch {
      /* corrupted — ignore */
    }
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* quota exceeded — ignore */
    }
  }, [cart]);

  const addToCart = useCallback(
    (id: string) => setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 })),
    [],
  );

  const removeFromCart = useCallback(
    (id: string) =>
      setCart((prev) => {
        const c = { ...prev };
        if (c[id] > 1) c[id]--;
        else delete c[id];
        return c;
      }),
    [],
  );

  const clearCart = useCallback(() => setCart({}), []);

  const { totalItems, totalPrice } = useMemo(() => {
    let items = 0;
    let price = 0;
    for (const [id, qty] of Object.entries(cart)) {
      items += qty;
      const p = allProducts.find((pp) => pp.id === id);
      if (p) price += p.price * qty;
    }
    return { totalItems: items, totalPrice: price };
  }, [cart]);

  const value = useMemo(
    () => ({ cart, totalItems, totalPrice, addToCart, removeFromCart, clearCart }),
    [cart, totalItems, totalPrice, addToCart, removeFromCart, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
