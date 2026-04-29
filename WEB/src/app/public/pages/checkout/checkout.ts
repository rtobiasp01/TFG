import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartItem, CartService } from '../../../services/cart-service';
import { OrderService } from '../../../services/order-service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  private readonly formBuilder = inject(FormBuilder);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);

  readonly processingCheckout = signal(false);
  readonly submitError = signal('');

  readonly paymentForm = this.formBuilder.nonNullable.group({
    cardHolder: ['', [Validators.required]],
    cardNumber: ['', [Validators.required]],
    expiryDate: ['', [Validators.required]],
    cvv: ['', [Validators.required]],
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

  private readonly currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  getItemTotal(item: CartItem): number {
    const unitPrice = item.basePrice + (item.variantAdditionalPrice ?? 0);
    return unitPrice * item.quantity;
  }

  hasCustomText(item: CartItem): boolean {
    return Boolean(item.customization?.customText?.trim());
  }

  getCustomText(item: CartItem): string {
    return item.customization?.customText?.trim() || '';
  }

  getPaymentCardPreview(): string {
    const cardDigits = this.paymentForm.controls.cardNumber.value.replace(/\D/g, '');
    return cardDigits.slice(-4).padStart(4, '0');
  }

  confirmPaymentAndCheckout(): void {
    if (this.processingCheckout()) {
      return;
    }

    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      this.submitError.set('Revisa los datos de la tarjeta antes de continuar.');
      return;
    }

    this.processingCheckout.set(true);
    this.submitError.set('');

    this.orderService.checkout({}).subscribe({
      next: () => {
        this.cartService.clearCart();
        this.processingCheckout.set(false);
        alert('Pedido realizado con exito');
        this.router.navigate(['/pedidos']);
      },
      error: (error) => {
        console.error('Checkout error:', error);
        this.processingCheckout.set(false);
        this.submitError.set('No se pudo completar el pedido. Intentalo de nuevo.');
      },
    });
  }
}
