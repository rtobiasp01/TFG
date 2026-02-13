import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Product } from '../interfaces/product';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private http = inject(HttpClient);

  private API_URL: string = 'http://localhost:3000';

  getAll() {
    const productos = this.http.get<Product[]>(`${this.API_URL}/products`);
    return productos;
  }
}
