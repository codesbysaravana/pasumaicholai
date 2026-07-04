import { create } from "zustand";
import { saveCart, type MarketplaceProduct } from "../services/marketplaceApi";

interface CartItem {
  product: MarketplaceProduct;
  quantity: number;
}

interface CheckoutDetails {
  name: string;
  phone: string;
  location: string;
  notes: string;
}

interface CartState {
  items: CartItem[];
  checkout: CheckoutDetails;
  isOpen: boolean;
  addProduct: (product: MarketplaceProduct, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clear: () => void;
  open: () => void;
  close: () => void;
  subtotal: () => number;
  setCheckout: (value: Partial<CheckoutDetails>) => void;
}

async function persistCart(items: CartItem[]) {
  await saveCart({
    items: items.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    })),
  });
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  checkout: {
    name: "",
    phone: "",
    location: "",
    notes: "",
  },
  isOpen: false,
  addProduct: async (product, quantity = 1) => {
    const previousItems = get().items;
    const existing = previousItems.find((item) => item.product.id === product.id);
    const nextItems = existing
      ? previousItems.map((item) =>
          item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + quantity, product.quantity) } : item,
        )
      : [...previousItems, { product, quantity: Math.min(quantity, product.quantity) }];
    set({ items: nextItems, isOpen: true });
    await persistCart(nextItems);
  },
  updateQuantity: async (productId, quantity) => {
    const safeQuantity = Math.max(1, quantity);
    const nextItems = get().items.map((item) =>
      item.product.id === productId ? { ...item, quantity: Math.min(safeQuantity, item.product.quantity) } : item,
    );
    set({ items: nextItems });
    await persistCart(nextItems);
  },
  removeItem: async (productId) => {
    const nextItems = get().items.filter((item) => item.product.id !== productId);
    set({ items: nextItems });
    await persistCart(nextItems);
  },
  clear: () => set({ items: [] }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  subtotal: () => get().items.reduce((sum, item) => sum + item.quantity * item.product.price, 0),
  setCheckout: (value) => set({ checkout: { ...get().checkout, ...value } }),
}));
