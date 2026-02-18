import { Component, inject, signal } from '@angular/core';
import { ProductService } from '../../services/product-service';
import { RouterLink } from '@angular/router';
import { Product } from '../../interfaces/product';
import { CurrencyPipe } from '@angular/common';
import { single } from 'rxjs';

@Component({
  selector: 'app-products',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {
  private productService = inject(ProductService);

  products = signal<Product[]>([]);

  constructor() {
    this.productService.getAll().subscribe({
      next: (value) => this.products.set(value),
    });
  }

  deleteProduct(id: string) {
    this.productService.delete(id).subscribe();
  }
}
