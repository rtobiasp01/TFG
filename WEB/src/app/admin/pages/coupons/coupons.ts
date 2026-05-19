import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActionMenu, ActionMenuItem } from '../../components/action-menu/action-menu';

interface Coupon {
  _id?: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  expiryDate: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionMenu],
  templateUrl: './coupons.html',
  styleUrl: './coupons.css',
})
export class AdminCoupons implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly API_BASE_URL = 'http://localhost:3000/coupons';

  readonly coupons = signal<Coupon[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');

  readonly showForm = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly editingId = signal<string | null>(null);

  readonly newCoupon = signal<Coupon>({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    maxUses: null,
    currentUses: 0,
    expiryDate: null,
    isActive: true,
  });

  ngOnInit(): void {
    this.loadCoupons();
  }

  private loadCoupons(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http.get<Coupon[]>(this.API_BASE_URL).subscribe({
      next: (coupons) => {
        this.coupons.set(coupons);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Error al cargar los cupones');
        this.isLoading.set(false);
        console.error('Error loading coupons:', error);
      },
    });
  }

  toggleForm(): void {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.newCoupon.set({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      maxUses: null,
      currentUses: 0,
      expiryDate: null,
      isActive: true,
    });
    this.editingId.set(null);
  }

  onSubmitCoupon(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const isEditing = this.editingId() !== null;
    const coupon = this.newCoupon();

    if (isEditing) {
      this.http.put<any>(`${this.API_BASE_URL}/${this.editingId()}`, coupon).subscribe({
        next: () => {
          this.successMessage.set('Cupón actualizado exitosamente');
          this.resetForm();
          this.loadCoupons();
          this.isSubmitting.set(false);

          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.error || 'Error al actualizar el cupón');
          this.isSubmitting.set(false);
          console.error('Error updating coupon:', error);
        },
      });
    } else {
      this.http.post<any>(this.API_BASE_URL, coupon).subscribe({
        next: () => {
          this.successMessage.set('Cupón creado exitosamente');
          this.resetForm();
          this.showForm.set(false);
          this.loadCoupons();
          this.isSubmitting.set(false);

          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.error || 'Error al crear el cupón');
          this.isSubmitting.set(false);
          console.error('Error creating coupon:', error);
        },
      });
    }
  }

  onEditCoupon(coupon: Coupon): void {
    this.editingId.set(coupon._id || null);
    this.newCoupon.set({ ...coupon });
    this.showForm.set(true);
  }

  onDeleteCoupon(couponId: string | undefined): void {
    if (!couponId) return;

    if (confirm('¿Estás seguro de que deseas eliminar este cupón?')) {
      this.http.delete<any>(`${this.API_BASE_URL}/${couponId}`).subscribe({
        next: () => {
          this.successMessage.set('Cupón eliminado exitosamente');
          this.loadCoupons();

          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          this.errorMessage.set('Error al eliminar el cupón');
          console.error('Error deleting coupon:', error);
        },
      });
    }
  }

  toggleActive(coupon: Coupon): void {
    const updatedCoupon = { ...coupon, isActive: !coupon.isActive };

    this.http.put<any>(`${this.API_BASE_URL}/${coupon._id}`, updatedCoupon).subscribe({
      next: () => {
        this.loadCoupons();
      },
      error: (error) => {
        console.error('Error toggling coupon status:', error);
      },
    });
  }

  getDiscountDisplay(coupon: Coupon): string {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}%`;
    }
    return `€${coupon.discountValue}`;
  }

  getRemainingUses(coupon: Coupon): string {
    if (!coupon.maxUses) return 'Ilimitados';
    return `${coupon.currentUses}/${coupon.maxUses}`;
  }

  isExpired(coupon: Coupon): boolean {
    if (!coupon.expiryDate) return false;
    return new Date() > new Date(coupon.expiryDate);
  }

  getEditAction(coupon: Coupon): () => void {
    return () => this.onEditCoupon(coupon);
  }

  getCouponActions(couponId: string | undefined): ActionMenuItem[] {
    return [
      { label: 'Eliminar', danger: true, action: () => this.onDeleteCoupon(couponId) },
    ];
  }
}
