import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Product } from '../interfaces/product';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private http = inject(HttpClient);

  private API_URL: string = 'http://localhost:3000/products';

  getAll() {
    const productos = this.http.get<Product[]>(this.API_URL);
    return productos;
  }

  getById(id: string) {
    return this.http.get<Product>(`${this.API_URL}/${id}`);
  }

  getBySku(sku: string) {
    return this.http.get<Product>(`${this.API_URL}/sku/${encodeURIComponent(sku)}`);
  }

  create(product: any) {
    return this.http.post<Product>(this.API_URL, product);
  }

  update(id: string, product: any) {
    return this.http.put<Product>(`${this.API_URL}/${id}`, product);
  }

  validateVariantStock(payload: {
    product_id?: string;
    product_sku?: string;
    variant_sku?: string;
    color?: string;
    talla?: string | number;
    quantity?: number;
  }) {
    return this.http.post<any>(`${this.API_URL}/validate-stock`, payload);
  }

  decrementVariantStock(payload: {
    product_id?: string;
    product_sku?: string;
    variant_sku?: string;
    color?: string;
    talla?: string | number;
    quantity?: number;
  }) {
    return this.http.post<any>(`${this.API_URL}/decrement-stock`, payload);
  }

  delete(id: string) {
    return this.http.delete<Product>(`${this.API_URL}/${id}`);
  }
}
