import { Component, computed, inject, signal } from '@angular/core';
import { CartService } from '../../../services/cart-service';
import { CartItem } from '../../../services/cart-service';

const REMOVE_ANIMATION_MS = 450;

@Component({
  selector: 'app-cart',
  standalone: true,
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  private readonly cartService = inject(CartService);
  private readonly deletingItemIds = signal<Set<string>>(new Set());
  private readonly currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

  readonly items = computed(() => this.cartService.cart().items);
  readonly totalItems = computed(() =>
    this.items().reduce((accumulator, item) => accumulator + item.quantity, 0),
  );
  readonly subtotal = computed(() =>
    this.items().reduce((accumulator, item) => {
      const unitPrice = item.basePrice + (item.variantAdditionalPrice ?? 0);
      return accumulator + unitPrice * item.quantity;
    }, 0),
  );
  readonly shipping = computed(() => (this.items().length > 0 ? 0 : 0));
  readonly total = computed(() => this.subtotal() + this.shipping());

  increaseQuantity(item: CartItem): void {
    this.cartService.updateQuantity(item.cartItemId, item.quantity + 1);
  }

  decreaseQuantity(item: CartItem): void {
    this.cartService.updateQuantity(item.cartItemId, Math.max(1, item.quantity - 1));
  }

  removeItem(item: CartItem): void {
    const itemId = item.cartItemId;

    if (this.isDeleting(item)) {
      return;
    }

    this.deletingItemIds.update((ids) => {
      const nextIds = new Set(ids);
      nextIds.add(itemId);
      return nextIds;
    });

    window.setTimeout(() => {
      this.cartService.removeItem(itemId);
      this.deletingItemIds.update((ids) => {
        const nextIds = new Set(ids);
        nextIds.delete(itemId);
        return nextIds;
      });
    }, REMOVE_ANIMATION_MS);
  }

  isDeleting(item: CartItem): boolean {
    return this.deletingItemIds().has(item.cartItemId);
  }

  removeIconPath(item: CartItem): string {
    return this.isDeleting(item) ? '/images/icons8-papelera.gif' : '/images/icons8-papelera-50.png';
  }

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }
}
