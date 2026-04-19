import { Component, computed, inject, signal } from '@angular/core';
import { CartService } from '../../../services/cart-service';
import { CartItem } from '../../../services/cart-service';
import { OrderService } from '../../../services/order-service';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service';

const REMOVE_ANIMATION_MS = 450;
const API_BASE_URL = 'http://localhost:3000';

@Component({
  selector: 'app-cart',
  standalone: true,
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly deletingItemIds = signal<Set<string>>(new Set());
  readonly selectedCustomImage = signal<string>('');
  readonly showCustomImageModal = signal<boolean>(false);
  readonly processingCheckout = signal<boolean>(false);
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

  hasCustomImage(item: CartItem): boolean {
    return Boolean(item.customization?.uploadedImageUrl?.trim());
  }

  customText(item: CartItem): string {
    return item.customization?.customText?.trim() || '';
  }

  openCustomImageModal(item: CartItem): void {
    const imageUrl = this.resolveCustomImageUrl(item.customization?.uploadedImageUrl);

    if (!imageUrl) {
      return;
    }

    this.selectedCustomImage.set(imageUrl);
    this.showCustomImageModal.set(true);
  }

  closeCustomImageModal(): void {
    this.showCustomImageModal.set(false);
    this.selectedCustomImage.set('');
  }

  removeIconPath(item: CartItem): string {
    return this.isDeleting(item) ? '/images/icons8-papelera.gif' : '/images/icons8-papelera-50.png';
  }

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  checkout(): void {
    if (!this.authService.isAuthenticated()) {
      alert('Debes iniciar sesión para realizar un pedido');
      this.router.navigate(['/login']);
      return;
    }

    if (this.items().length === 0) {
      alert('El carrito está vacío');
      return;
    }

    this.processingCheckout.set(true);
    this.orderService.checkout().subscribe({
      next: () => {
        this.processingCheckout.set(false);
        alert('¡Pedido realizado con éxito!');
        this.router.navigate(['/pedidos']);
      },
      error: (error) => {
        this.processingCheckout.set(false);
        console.error('Error al realizar el pedido:', error);
        alert('Error al realizar el pedido. Por favor intenta de nuevo.');
      },
    });
  }

  private resolveCustomImageUrl(imageUrl?: string | null): string {
    const normalizedImageUrl = imageUrl?.trim();

    if (!normalizedImageUrl) {
      return '';
    }

    if (/^https?:\/\//i.test(normalizedImageUrl)) {
      return normalizedImageUrl;
    }

    const sanitizedPath = normalizedImageUrl.replace(/^\/+/, '');

    return `${API_BASE_URL}/${sanitizedPath}`;
  }
}
