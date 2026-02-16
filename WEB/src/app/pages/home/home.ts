import { Component, inject } from '@angular/core';
import { ProductService } from '../../services/product-service';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { filter, map, Observable } from 'rxjs';
import { Product } from '../../interfaces/product';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, RouterLink, CurrencyPipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private productService = inject(ProductService);

  products$: Observable<Product[]> = this.productService.getAll();

  filteredProducts$ = this.products$;

  ordenarPrecio() {
    this.filteredProducts$ = this.filteredProducts$.pipe(
      map((products) => [...products].sort((a, b) => a.price - b.price)),
    );
  }
}
