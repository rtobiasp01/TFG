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
    return this.http.get(`${this.API_URL}/products`);
  }
}
