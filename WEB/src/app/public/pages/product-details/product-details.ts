import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../../interfaces/product';
import { ProductService } from '../../../services/product-service';
import { Variant } from '../../../interfaces/variant';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
})
export class ProductDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);

  readonly product = signal<Product | null>(null);
  readonly variant = signal<Variant | undefined>(undefined);

  constructor() {
    this.setProductoActual();
  }

  private setProductoActual(): void {
    const sku = this.route.snapshot.paramMap.get('sku');
    if (!sku) {
      this.product.set(null);
      return;
    }

    this.productService.getBySku(sku).subscribe({
      next: (product) => {
        this.product.set(product);
        this.variant.set(product?.variantes?.[0]);
      },
      error: () => {
        this.product.set(null);
        this.variant.set(undefined);
      },
    });
  }
}
