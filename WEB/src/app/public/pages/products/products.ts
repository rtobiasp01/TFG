import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product } from '../../../interfaces/product';
import { ProductService } from '../../../services/product-service';
import { ProductCard } from '../../components/product-card/product-card';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [ProductCard, RouterLink],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {
  private readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);

  readonly productList = signal<Product[]>([]);
  readonly selectedCategory = signal<string>('');

  readonly filteredProducts = computed(() => {
    const category = this.selectedCategory().trim().toLowerCase();

    if (!category) {
      return this.productList();
    }

    return this.productList().filter((product) =>
      (product.categoria ?? []).some((item) => item.toLowerCase() === category),
    );
  });

  readonly pageTitle = computed(() =>
    this.selectedCategory() ? `Catálogo: ${this.selectedCategory()}` : 'Catálogo completo',
  );

  constructor() {
    this.productService.getAll().subscribe({
      next: (data) => {
        this.productList.set(data ?? []);
      },
      error: () => {
        this.productList.set([]);
      },
    });

    this.route.queryParamMap.subscribe((params) => {
      this.selectedCategory.set(params.get('categoria') ?? '');
    });
  }
}
