import { Injectable, signal } from '@angular/core';

export interface CartItem {
  cartItemId: string;
  productId: string;
  productTitle: string;
  productType: string;
  productImage: string;
  basePrice: number;
  simpleSku?: string;
  variantSku?: string;
  variantAttributes?: Record<string, string | number>;
  variantAdditionalPrice?: number;
  quantity: number;
  availableStock: number;
}

export interface CartState {
  items: CartItem[];
  lastUpdated: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly STORAGE_KEY = 'tfg_cart';
  readonly cart = signal<CartState>({ items: [], lastUpdated: 0 });

  constructor() {
    this.loadFromStorage();
  }

  addItem(item: Omit<CartItem, 'cartItemId'>): CartItem {
    const cartItemId = this.generateCartItemId();
    const newItem: CartItem = { ...item, cartItemId };

    const existingItem = this.findDuplicateItem(newItem);

    if (existingItem) {
      this.updateQuantity(existingItem.cartItemId, existingItem.quantity + item.quantity);
    } else {
      this.cart.update((state) => ({
        ...state,
        items: [...state.items, newItem],
        lastUpdated: Date.now(),
      }));
    }

    this.saveToStorage();
    this.logCart();
    return newItem;
  }

  updateQuantity(cartItemId: string, quantity: number): void {
    this.cart.update((state) => ({
      ...state,
      items: state.items.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity: Math.max(1, quantity) } : item,
      ),
      lastUpdated: Date.now(),
    }));

    this.saveToStorage();
    this.logCart();
  }

  removeItem(cartItemId: string): void {
    this.cart.update((state) => ({
      ...state,
      items: state.items.filter((item) => item.cartItemId !== cartItemId),
      lastUpdated: Date.now(),
    }));

    this.saveToStorage();
    this.logCart();
  }

  clearCart(): void {
    this.cart.set({ items: [], lastUpdated: Date.now() });
    this.saveToStorage();
    this.logCart();
  }

  private findDuplicateItem(item: CartItem): CartItem | undefined {
    return this.cart().items.find((existingItem) => {
      const isSameProduct = existingItem.productId === item.productId;
      const isSameType = existingItem.productType === item.productType;

      if (item.productType === 'simple') {
        return isSameProduct && isSameType && existingItem.simpleSku === item.simpleSku;
      }

      if (item.productType === 'variable') {
        return (
          isSameProduct &&
          isSameType &&
          existingItem.variantSku === item.variantSku &&
          JSON.stringify(existingItem.variantAttributes) === JSON.stringify(item.variantAttributes)
        );
      }

      return false;
    });
  }

  private generateCartItemId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cart()));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored) as CartState;
        this.cart.set(state);
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      this.cart.set({ items: [], lastUpdated: 0 });
    }
  }

  private logCart(): void {
    console.log('🛒 Carrito actual:', this.cart().items);
  }
}
