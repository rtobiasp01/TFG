import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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

  readonly checkoutForm = this.formBuilder.nonNullable.group({
    shippingAddress: this.formBuilder.nonNullable.group({
      street: ['Calle Mayor 123', [Validators.required, Validators.minLength(5)]],
      city: ['Madrid', [Validators.required, Validators.minLength(2)]],
      zipCode: ['28013', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      country: ['España', [Validators.required, Validators.minLength(2)]],
    }),
    cardHolder: ['Ruben Prueba', [Validators.required, Validators.minLength(3)]],
    cardNumber: [
      '4242 4242 4242 4242',
      [Validators.required, Validators.pattern(/^(\d{4}\s?){3}\d{4}$/)],
    ],
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

  private readonly currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  controlHasError(path: string): boolean {
    const control = this.getControl(path);

    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  controlErrorMessage(path: string): string {
    const control = this.getControl(path);

    if (!control || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres.`;
    }

    if (control.errors['pattern']) {
      if (path === 'shippingAddress.zipCode') {
        return 'Introduce un código postal válido de 5 dígitos.';
      }

      if (path === 'cardNumber') {
        return 'Introduce un número de tarjeta válido de 16 dígitos.';
      }

      if (path === 'expiryDate') {
        return 'Usa el formato MM/AA.';
      }

      if (path === 'cvv') {
        return 'El CVV debe tener 3 dígitos.';
      }
    }

    return 'Valor no válido.';
  }

  shippingAddressLabel(): string {
    const shippingAddress = this.checkoutForm.controls.shippingAddress.getRawValue();
    const addressParts = [
      shippingAddress.street,
      shippingAddress.city,
      shippingAddress.zipCode,
      shippingAddress.country,
    ]
      .map((part) => part.trim())
      .filter(Boolean);

    return addressParts.length > 0 ? addressParts.join(', ') : 'Dirección de envío pendiente';
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
    const cardDigits = this.checkoutForm.controls.cardNumber.value.replace(/\D/g, '');
    return cardDigits.slice(-4).padStart(4, '0');
  }

  private getControl(path: string): AbstractControl | null {
    return this.checkoutForm.get(path);
  }

  confirmPaymentAndCheckout(): void {
    if (this.processingCheckout()) {
      return;
    }

    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.submitError.set(
        'Revisa la dirección de envío y los datos de la tarjeta antes de continuar.',
      );
      return;
    }

    this.processingCheckout.set(true);
    this.submitError.set('');

    const shippingAddress = this.checkoutForm.controls.shippingAddress.getRawValue();

    this.orderService.checkout(shippingAddress).subscribe({
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
