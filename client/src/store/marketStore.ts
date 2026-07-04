import { create } from "zustand";
import { createProduct, getProducts } from "../api/marketApi";
import type { Product, ProductCreateInput } from "../types/market";

interface MarketState {
  products: Product[];
  isLoading: boolean;
  selectedProductId: string | null;
  loadProducts: () => Promise<void>;
  addProduct: (payload: ProductCreateInput) => Promise<void>;
  selectProduct: (productId: string | null) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  products: [],
  isLoading: false,
  selectedProductId: null,
  loadProducts: async () => {
    set({ isLoading: true });
    try {
      const data = await getProducts();
      set({ products: data });
    } finally {
      set({ isLoading: false });
    }
  },
  addProduct: async (payload) => {
    const newProduct = await createProduct(payload);
    set((state) => ({ products: [newProduct, ...state.products] }));
  },
  selectProduct: (selectedProductId) => set({ selectedProductId }),
}));
