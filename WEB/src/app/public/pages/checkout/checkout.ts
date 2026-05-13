import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartItem, CartService } from '../../../services/cart-service';
import { OrderService } from '../../../services/order-service';
import { CouponService, Coupon } from '../../../services/coupon-service';
import { AuthService } from '../../../services/auth-service';

const CARDHOLDER_NAME_REGEX = /^[A-Za-zÀ-ÿ' -]{2,60}$/;

function expiryDateNotExpiredValidator(control: AbstractControl) {
  const value = String(control.value || '').trim();

  if (!value) {
    return null;
  }

  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const expiryDate = new Date(year, month, 0, 23, 59, 59, 999);

  return expiryDate < new Date() ? { expiredCard: true } : null;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  private readonly formBuilder = inject(FormBuilder);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly couponService = inject(CouponService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly processingCheckout = signal(false);
  readonly submitError = signal('');
  readonly showSuccessModal = signal(false);
  readonly savePersonalDataForFuture = signal(false);
  readonly saveShippingAddressForFuture = signal(false);

  // Coupon related
  readonly couponCode = signal<string>('');
  readonly appliedCoupon = signal<Coupon | null>(null);
  readonly couponError = signal<string>('');
  readonly couponLoading = signal<boolean>(false);

  readonly checkoutForm = this.formBuilder.nonNullable.group({
    personalData: this.formBuilder.nonNullable.group({
      firstName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern(/^[A-Za-zÀ-ÿ' -]{2,60}$/),
        ],
      ],
      lastName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern(/^[A-Za-zÀ-ÿ' -]{2,60}$/),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{9,15}$/)]],
      documentId: [
        '',
        [Validators.required, Validators.pattern(/^([XYZxyz]\d{7}[A-Za-z]|\d{8}[A-Za-z])$/)],
      ],
    }),
    shippingAddress: this.formBuilder.nonNullable.group({
      street: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      country: ['', [Validators.required, Validators.minLength(2)]],
    }),
    cardHolder: [
      'Ruben Prueba',
      [Validators.required, Validators.minLength(3), Validators.pattern(CARDHOLDER_NAME_REGEX)],
    ],
    cardNumber: [
      '4242 4242 4242 4242',
      [Validators.required, Validators.pattern(/^(\d{4}\s?){3}\d{4}$/)],
    ],
    expiryDate: [
      '12/29',
      [
        Validators.required,
        Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/),
        expiryDateNotExpiredValidator,
      ],
    ],
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

  readonly discountAmount = computed(() => {
    const coupon = this.appliedCoupon();
    if (!coupon) return 0;

    const baseAmount = this.subtotal() + this.shipping();
    if (coupon.discountType === 'percentage') {
      return Math.round(((baseAmount * coupon.discountValue) / 100) * 100) / 100;
    } else {
      return Math.min(coupon.discountValue, baseAmount);
    }
  });

  readonly total = computed(() => {
    const baseTotal = this.subtotal() + this.shipping();
    return Math.max(0, baseTotal - this.discountAmount());
  });

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
      if (path === 'personalData.firstName' || path === 'personalData.lastName') {
        return 'Solo se permiten letras, espacios, apostrofes y guiones.';
      }

      if (path === 'personalData.phone') {
        return 'Introduce un telefono valido (9 a 15 digitos).';
      }

      if (path === 'personalData.documentId') {
        return 'Introduce un DNI o NIE valido (ejemplo: 12345678Z).';
      }

      if (path === 'cardHolder') {
        return 'El nombre de la tarjeta solo puede contener letras y espacios.';
      }

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

    if (control.errors['expiredCard']) {
      return 'La tarjeta está caducada.';
    }

    if (control.errors['email']) {
      return 'Introduce un correo electronico valido.';
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

  ngOnInit(): void {
    this.authService.fetchMe().subscribe({
      next: (response) => {
        this.prefillCheckoutData(
          response.user?.personalData || {},
          response.user?.shippingAddress || {},
        );
      },
      error: () => {
        const currentUser = this.authService.currentUser();
        if (currentUser) {
          this.prefillCheckoutData(
            currentUser.personalData || {},
            currentUser.shippingAddress || {},
          );
        }
      },
    });
  }

  applyCoupon(): void {
    const code = this.couponCode().trim();

    if (!code) {
      this.couponError.set('Introduce un código de cupón');
      return;
    }

    this.couponLoading.set(true);
    this.couponError.set('');

    this.couponService.validateCoupon(code).subscribe({
      next: (response) => {
        this.appliedCoupon.set(response.data);
        this.couponError.set('');
        this.couponLoading.set(false);
      },
      error: (error) => {
        this.couponError.set(error.error?.error || 'Cupón no válido');
        this.appliedCoupon.set(null);
        this.couponLoading.set(false);
      },
    });
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
    this.couponCode.set('');
    this.couponError.set('');
  }

  confirmPaymentAndCheckout(): void {
    if (this.processingCheckout()) {
      return;
    }

    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.submitError.set(
        'Revisa los datos personales, la direccion de envio y los datos de la tarjeta antes de continuar.',
      );
      return;
    }

    this.processingCheckout.set(true);
    this.submitError.set('');

    const personalData = this.checkoutForm.controls.personalData.getRawValue();
    const shippingAddress = this.checkoutForm.controls.shippingAddress.getRawValue();
    const couponCode = this.appliedCoupon()?.code || null;

    this.orderService.checkout(personalData, shippingAddress, couponCode).subscribe({
      next: () => {
        // Registrar el uso del cupón si se aplicó
        if (couponCode) {
          this.couponService.incrementCouponUse(couponCode).subscribe({
            error: (error) => {
              console.error('Error incrementing coupon use:', error);
            },
          });
        }

        this.cartService.clearCart();
        this.processingCheckout.set(false);

        if (this.savePersonalDataForFuture() || this.saveShippingAddressForFuture()) {
          const updatePayload: {
            personalData?: typeof personalData;
            shippingAddress?: typeof shippingAddress;
          } = {};

          if (this.savePersonalDataForFuture()) {
            updatePayload.personalData = personalData;
          }

          if (this.saveShippingAddressForFuture()) {
            updatePayload.shippingAddress = shippingAddress;
          }

          this.authService.updateProfileData(updatePayload).subscribe({
            error: (profileUpdateError) => {
              console.error('Error saving checkout data to user profile:', profileUpdateError);
            },
          });
        }

        this.showSuccessModal.set(true);
      },
      error: (error) => {
        console.error('Checkout error:', error);
        this.processingCheckout.set(false);
        this.submitError.set('No se pudo completar el pedido. Intentalo de nuevo.');
      },
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal.set(false);
  }

  private prefillCheckoutData(
    personalData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      documentId?: string;
    },
    shippingAddress: {
      street?: string;
      city?: string;
      zipCode?: string;
      country?: string;
    },
  ): void {
    const personalForm = this.checkoutForm.controls.personalData;
    const shippingForm = this.checkoutForm.controls.shippingAddress;

    if (personalData && Object.keys(personalData).length > 0) {
      personalForm.patchValue({
        firstName: personalData.firstName || personalForm.controls.firstName.value,
        lastName: personalData.lastName || personalForm.controls.lastName.value,
        email: personalData.email || personalForm.controls.email.value,
        phone: personalData.phone || personalForm.controls.phone.value,
        documentId: personalData.documentId || personalForm.controls.documentId.value,
      });
    }

    if (shippingAddress && Object.keys(shippingAddress).length > 0) {
      shippingForm.patchValue({
        street: shippingAddress.street || shippingForm.controls.street.value,
        city: shippingAddress.city || shippingForm.controls.city.value,
        zipCode: shippingAddress.zipCode || shippingForm.controls.zipCode.value,
        country: shippingAddress.country || shippingForm.controls.country.value,
      });
    }
  }
}
