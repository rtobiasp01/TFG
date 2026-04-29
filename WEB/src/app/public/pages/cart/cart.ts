import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  imports: [ReactiveFormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  private readonly formBuilder = inject(FormBuilder);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly deletingItemIds = signal<Set<string>>(new Set());
  readonly selectedCustomImage = signal<string>('');
  readonly showCustomImageModal = signal<boolean>(false);
  readonly showPaymentModal = signal<boolean>(false);
  readonly processingCheckout = signal<boolean>(false);
  private readonly currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

  readonly paymentForm = this.formBuilder.nonNullable.group({
    cardHolder: ['Ruben Prueba', [Validators.required]],
    cardNumber: ['4242 4242 4242 4242', [Validators.required, Validators.pattern(/^[0-9 ]{19}$/)]],
    expiryDate: ['12/29', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvv: ['123', [Validators.required, Validators.pattern(/^\d{3}$/)]],
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

    this.resetPaymentForm();
    this.showPaymentModal.set(true);
  }

  closePaymentModal(): void {
    if (this.processingCheckout()) {
      return;
    }

    this.showPaymentModal.set(false);
    this.resetPaymentForm();
  }

  confirmPaymentAndCheckout(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.processingCheckout.set(true);

    this.orderService.checkout().subscribe({
      next: () => {
        this.processingCheckout.set(false);
        this.showPaymentModal.set(false);
        alert('¡Pedido realizado con éxito!');
        this.resetPaymentForm();
        this.router.navigate(['/pedidos']);
      },
      error: (error) => {
        this.processingCheckout.set(false);
        console.error('Error al realizar el pedido:', error);
        alert('Error al realizar el pedido. Por favor intenta de nuevo.');
      },
    });
  }

  getPaymentCardPreview(): string {
    const cardNumber = this.paymentForm.controls.cardNumber.value.replace(/\s+/g, '');

    return cardNumber.length >= 4 ? cardNumber.slice(-4) : '4242';
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

  private resetPaymentForm(): void {
    this.paymentForm.setValue({
      cardHolder: 'Ruben Prueba',
      cardNumber: '4242 4242 4242 4242',
      expiryDate: '12/29',
      cvv: '123',
    });
    this.paymentForm.markAsPristine();
    this.paymentForm.markAsUntouched();
  }
}
