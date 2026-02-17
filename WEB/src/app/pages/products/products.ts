import { Component, inject } from '@angular/core';
import { ProductService } from '../../services/product-service';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Product } from '../../interfaces/product';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-products',
  imports: [AsyncPipe, RouterLink, CurrencyPipe],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {
  private productService = inject(ProductService);

  products$: Observable<Product[]> = this.productService.getAll();

  deleteProduct(id: string) {
    this.productService.delete(id).subscribe();
  }
}
