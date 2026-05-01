import { Component, computed, inject, signal, OnInit } from '@angular/core';
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
export class Products implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);

  readonly productList = signal<Product[]>([]);
  readonly selectedCategory = signal<string>('');
  readonly searchQuery = signal<string>('');

  readonly filteredProducts = computed(() => {
    const category = this.selectedCategory().trim().toLowerCase();
    const query = this.searchQuery().trim().toLowerCase();

    let result = this.productList();

    if (category) {
      result = result.filter((product) =>
        (product.categoria ?? []).some((item) => item.toLowerCase() === category),
      );
    }

    if (query) {
      result = result.filter(
        (product) =>
          product.title?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query),
      );
    }

    return result;
  });

  readonly pageTitle = computed(() => {
    if (this.searchQuery()) {
      return `Búsqueda: ${this.searchQuery()}`;
    }
    return this.selectedCategory() ? `Catálogo: ${this.selectedCategory()}` : 'Catálogo completo';
  });

  constructor() {
    this.productService.getAll().subscribe({
      next: (data) => {
        this.productList.set(data ?? []);
      },
      error: () => {
        this.productList.set([]);
      },
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.selectedCategory.set(params.get('categoria') ?? '');
      this.searchQuery.set(params.get('search') ?? '');
    });
  }
}
