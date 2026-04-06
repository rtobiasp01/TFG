import { Component, inject, signal } from '@angular/core';
import { ProductService } from '../../../services/product-service';
import { Product } from '../../../interfaces/product';
import { ProductCard } from '../../components/product-card/product-card';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-products',
  imports: [ProductCard, RouterLink],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {

  private productService : ProductService = inject(ProductService);

  productList = signal<Product[]>([]);

  constructor() {
    this.productService.getAll().subscribe(
        (data: any)  => {
          this.productList.set(data);
      }
    );
  }

}
