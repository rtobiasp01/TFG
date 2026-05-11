import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Coupon {
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

@Injectable({
  providedIn: 'root',
})
export class CouponService {
  private http = inject(HttpClient);
  private readonly API_BASE_URL = 'http://localhost:3000/coupons';

  validateCoupon(code: string): Observable<any> {
    return this.http.get<any>(`${this.API_BASE_URL}/validate/${code}`);
  }

  incrementCouponUse(code: string): Observable<any> {
    return this.http.post<any>(`${this.API_BASE_URL}/${code}/use`, {});
  }
}
