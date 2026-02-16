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

  create(product: any) {
    return this.http.post<Product>(this.API_URL, product);
  }

  update(id: string, product: any) {
    return this.http.put<Product>(`${this.API_URL}/${id}`, product);
  }
}
