import { HttpClient } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { ProductType, UserCustomization } from '../interfaces/customization';
import { AuthService } from './auth-service';

const CART_API_URL = 'http://localhost:3000/cart/me';

export interface CartItem {
  cartItemId: string;
  productId: string;
  productTitle: string;
  productType: ProductType;
  productImage: string;
  basePrice: number;
  simpleSku?: string;
  variantSku?: string;
  variantAttributes?: Record<string, string | number>;
  variantAdditionalPrice?: number;
  customization?: UserCustomization;
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
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly STORAGE_KEY = 'tfg_cart';
  readonly cart = signal<CartState>({ items: [], lastUpdated: 0 });

  constructor() {
    this.loadFromStorage();

    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();

      if (isAuthenticated) {
        this.loadFromApi();
        return;
      }

      this.loadFromStorage();
    });
  }

  addItem(item: Omit<CartItem, 'cartItemId'>): CartItem {
    const cartItemId = this.generateCartItemId();
    const newItem: CartItem = { ...item, cartItemId };

    const existingItem = this.findDuplicateItem(newItem);

    if (existingItem) {
      this.updateQuantity(existingItem.cartItemId, existingItem.quantity + item.quantity);
      return existingItem;
    } else {
      this.cart.update((state) => ({
        ...state,
        items: [...state.items, newItem],
        lastUpdated: Date.now(),
      }));
    }

    this.persistCurrentState();
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

    this.persistCurrentState();
    this.logCart();
  }

  removeItem(cartItemId: string): void {
    this.cart.update((state) => ({
      ...state,
      items: state.items.filter((item) => item.cartItemId !== cartItemId),
      lastUpdated: Date.now(),
    }));

    this.persistCurrentState();
    this.logCart();
  }

  clearCart(): void {
    this.cart.set({ items: [], lastUpdated: Date.now() });
    this.persistCurrentState();
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
          this.serializeRecord(existingItem.variantAttributes) ===
            this.serializeRecord(item.variantAttributes)
        );
      }

      if (item.productType === 'custom-personalized') {
        return (
          isSameProduct &&
          isSameType &&
          existingItem.variantSku === item.variantSku &&
          this.serializeRecord(existingItem.variantAttributes) ===
            this.serializeRecord(item.variantAttributes) &&
          this.serializeCustomization(existingItem.customization) ===
            this.serializeCustomization(item.customization)
        );
      }

      return false;
    });
  }

  private serializeRecord(record?: Record<string, string | number>): string {
    if (!record) {
      return '';
    }

    return JSON.stringify(
      Object.keys(record)
        .sort()
        .reduce<Record<string, string | number>>((accumulator, key) => {
          accumulator[key] = record[key];
          return accumulator;
        }, {}),
    );
  }

  private serializeCustomization(customization?: UserCustomization): string {
    if (!customization) {
      return '';
    }

    const { timestamp, ...rest } = customization;

    return JSON.stringify(
      Object.keys(rest)
        .sort()
        .reduce<Record<string, unknown>>((accumulator, key) => {
          accumulator[key] = rest[key as keyof Omit<UserCustomization, 'timestamp'>];
          return accumulator;
        }, {}),
    );
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
        this.cart.set(this.normalizeCartState(state));
        return;
      }

      this.cart.set({ items: [], lastUpdated: 0 });
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      this.cart.set({ items: [], lastUpdated: 0 });
    }
  }

  private persistCurrentState(): void {
    if (this.authService.isAuthenticated()) {
      this.saveToApi();
      return;
    }

    this.saveToStorage();
  }

  private saveToApi(): void {
    this.http.put<CartState>(CART_API_URL, this.cart()).subscribe({
      error: (error) => {
        console.error('Error saving cart to API:', error);
      },
    });
  }

  private loadFromApi(): void {
    this.http.get<Partial<CartState>>(CART_API_URL).subscribe({
      next: (state) => {
        this.cart.set(this.normalizeCartState(state));
      },
      error: (error) => {
        console.error('Error loading cart from API:', error);
        this.cart.set({ items: [], lastUpdated: 0 });
      },
    });
  }

  private normalizeCartState(state: Partial<CartState> | null | undefined): CartState {
    const items = Array.isArray(state?.items)
      ? state.items
          .filter((item): item is CartItem => Boolean(item && typeof item === 'object'))
          .map((item) => ({
            ...item,
            cartItemId: item.cartItemId || this.generateCartItemId(),
          }))
      : [];

    const parsedLastUpdated = Number(state?.lastUpdated);
    const lastUpdated = Number.isFinite(parsedLastUpdated) ? parsedLastUpdated : 0;

    return { items, lastUpdated };
  }

  private logCart(): void {
    console.log('🛒 Carrito actual:', this.cart().items);
  }
}
