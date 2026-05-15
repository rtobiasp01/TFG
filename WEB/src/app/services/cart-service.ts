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
  private wasAuthenticated = false;
  readonly cart = signal<CartState>({ items: [], lastUpdated: 0 });

  constructor() {
    this.loadFromStorage();

    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();

      if (isAuthenticated) {
        if (!this.wasAuthenticated) {
          this.wasAuthenticated = true;
          this.mergeLocalCartIntoApi();
          return;
        }

        this.loadFromApi();
        return;
      }

      this.wasAuthenticated = false;
      this.loadFromStorage();
    });
  }

  addItem(item: Omit<CartItem, 'cartItemId'>): CartItem {
    const cartItemId = this.generateCartItemId();
    const availableStock = this.normalizeAvailableStock(item.availableStock);
    const newItem: CartItem = { ...item, cartItemId, availableStock };

    const existingItem = this.findDuplicateItem(newItem);

    if (existingItem) {
      const stockLimit = Math.max(
        0,
        Math.min(
          existingItem.availableStock || 0,
          availableStock || existingItem.availableStock || 0,
        ),
      );

      this.cart.update((state) => ({
        ...state,
        items: state.items.map((currentItem) => {
          if (currentItem.cartItemId !== existingItem.cartItemId) {
            return currentItem;
          }

          if (stockLimit <= 0) {
            return {
              ...currentItem,
              availableStock: 0,
            };
          }

          return {
            ...currentItem,
            quantity: Math.min(currentItem.quantity + item.quantity, stockLimit),
            availableStock: stockLimit,
          };
        }),
        lastUpdated: Date.now(),
      }));

      this.persistCurrentState();
      this.logCart();
      return existingItem;
    }

    if (availableStock <= 0) {
      return newItem;
    }

    this.cart.update((state) => ({
      ...state,
      items: [
        ...state.items,
        { ...newItem, quantity: Math.min(Math.max(1, item.quantity), availableStock) },
      ],
      lastUpdated: Date.now(),
    }));

    this.persistCurrentState();
    this.logCart();
    return newItem;
  }

  updateQuantity(cartItemId: string, quantity: number): void {
    this.cart.update((state) => ({
      ...state,
      items: state.items.map((item) => {
        if (item.cartItemId !== cartItemId) {
          return item;
        }

        const availableStock = this.normalizeAvailableStock(item.availableStock);

        if (availableStock <= 0) {
          return item;
        }

        return {
          ...item,
          quantity: Math.min(Math.max(1, quantity), availableStock),
          availableStock,
        };
      }),
      lastUpdated: Date.now(),
    }));

    this.persistCurrentState();
    this.logCart();
  }

  syncAvailableStock(resolveAvailableStock: (item: CartItem) => number): void {
    this.cart.update((state) => ({
      ...state,
      items: state.items.map((item) => ({
        ...item,
        availableStock: this.normalizeAvailableStock(resolveAvailableStock(item)),
      })),
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

  private normalizeAvailableStock(value: number | undefined): number {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;
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
      const state = this.readStorageState();

      if (state) {
        this.cart.set(state);
        return;
      }

      this.cart.set({ items: [], lastUpdated: 0 });
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      this.cart.set({ items: [], lastUpdated: 0 });
    }
  }

  private readStorageState(): CartState | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);

      if (!stored) {
        return null;
      }

      return this.normalizeCartState(JSON.parse(stored) as CartState);
    } catch (error) {
      console.error('Error reading cart state from localStorage:', error);
      return null;
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

  private mergeLocalCartIntoApi(): void {
    const localCart = this.readStorageState();

    this.http.get<Partial<CartState>>(CART_API_URL).subscribe({
      next: (remoteState) => {
        const remoteCart = this.normalizeCartState(remoteState);

        if (!localCart || localCart.items.length === 0) {
          this.cart.set(remoteCart);
          return;
        }

        const mergedCart = this.mergeCartStates(remoteCart, localCart);

        this.http.put<CartState>(CART_API_URL, mergedCart).subscribe({
          next: () => {
            this.cart.set(mergedCart);
            localStorage.removeItem(this.STORAGE_KEY);
          },
          error: (error) => {
            console.error('Error saving merged cart to API:', error);
            this.cart.set(remoteCart);
          },
        });
      },
      error: (error) => {
        console.error('Error loading cart from API during merge:', error);
        this.cart.set({ items: [], lastUpdated: 0 });
      },
    });
  }

  private mergeCartStates(primary: CartState, secondary: CartState): CartState {
    const mergedItems = primary.items.map((item) => ({ ...item }));

    secondary.items.forEach((item) => {
      const duplicate = mergedItems.find((existingItem) => this.isSameCartItem(existingItem, item));

      if (duplicate) {
        duplicate.quantity += item.quantity;
        return;
      }

      mergedItems.push({
        ...item,
        cartItemId: item.cartItemId || this.generateCartItemId(),
      });
    });

    return {
      items: mergedItems,
      lastUpdated: Math.max(primary.lastUpdated, secondary.lastUpdated, Date.now()),
    };
  }

  private isSameCartItem(left: CartItem, right: CartItem): boolean {
    const isSameProduct = left.productId === right.productId;
    const isSameType = left.productType === right.productType;

    if (left.productType === 'simple' && right.productType === 'simple') {
      return isSameProduct && isSameType && left.simpleSku === right.simpleSku;
    }

    if (left.productType === 'variable' && right.productType === 'variable') {
      return (
        isSameProduct &&
        isSameType &&
        left.variantSku === right.variantSku &&
        this.serializeRecord(left.variantAttributes) ===
          this.serializeRecord(right.variantAttributes)
      );
    }

    if (left.productType === 'custom-personalized' && right.productType === 'custom-personalized') {
      return (
        isSameProduct &&
        isSameType &&
        left.variantSku === right.variantSku &&
        this.serializeRecord(left.variantAttributes) ===
          this.serializeRecord(right.variantAttributes) &&
        this.serializeCustomization(left.customization) ===
          this.serializeCustomization(right.customization)
      );
    }

    return false;
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
  }
}
