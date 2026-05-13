import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../../interfaces/product';
import { Review } from '../../../interfaces/review';
import { ProductService } from '../../../services/product-service';
import { ReviewService } from '../../../services/review-service';
import { ProductCard } from '../../components/product-card/product-card';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating-desc';

interface RatingSummary {
  total: number;
  count: number;
}

interface SortOptionItem {
  label: string;
  value: SortOption;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [ProductCard],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reviewService = inject(ReviewService);

  readonly productList = signal<Product[]>([]);
  readonly selectedCategory = signal<string>('');
  readonly searchQuery = signal<string>('');
  readonly selectedSort = signal<SortOption>('featured');
  readonly reviews = signal<Review[]>([]);

  readonly sortOptions: SortOptionItem[] = [
    { label: 'Destacados', value: 'featured' },
    { label: 'Precio: menor a mayor', value: 'price-asc' },
    { label: 'Precio: mayor a menor', value: 'price-desc' },
    { label: 'Mejor valorados', value: 'rating-desc' },
  ];

  readonly availableCategories = computed(() =>
    Array.from(
      new Set(
        this.productList()
          .flatMap((product) => product.categoria ?? [])
          .map((category) => category.trim())
          .filter((category) => category.length > 0),
      ),
    ).sort((left, right) => left.localeCompare(right, 'es')),
  );

  readonly catalogQueryParams = computed(() => {
    const queryParams: Record<string, string> = {};

    if (this.selectedCategory()) {
      queryParams['categoria'] = this.selectedCategory();
    }

    if (this.searchQuery()) {
      queryParams['search'] = this.searchQuery();
    }

    if (this.selectedSort() !== 'featured') {
      queryParams['sort'] = this.selectedSort();
    }

    return queryParams;
  });

  readonly reviewSummaryByProduct = computed(() => {
    const summary = new Map<string, RatingSummary>();

    this.reviews().forEach((review) => {
      const productId = String(review.product_id || '').trim();
      const rating = Number(review.rating) || 0;

      if (!productId || rating <= 0) {
        return;
      }

      const current = summary.get(productId) || { total: 0, count: 0 };
      current.total += rating;
      current.count += 1;
      summary.set(productId, current);
    });

    return summary;
  });

  readonly filteredProducts = computed(() => {
    const category = this.selectedCategory().trim().toLowerCase();
    const query = this.searchQuery().trim().toLowerCase();
    const sortOption = this.selectedSort();

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

    result = [...result].sort((left, right) => {
      if (sortOption === 'price-asc' || sortOption === 'price-desc') {
        const leftPrice = this.getEffectivePrice(left);
        const rightPrice = this.getEffectivePrice(right);

        if (leftPrice !== rightPrice) {
          return sortOption === 'price-asc' ? leftPrice - rightPrice : rightPrice - leftPrice;
        }

        return left.title.localeCompare(right.title, 'es');
      }

      if (sortOption === 'rating-desc') {
        const leftRating = this.getAverageRating(left._id);
        const rightRating = this.getAverageRating(right._id);

        if (rightRating !== leftRating) {
          return rightRating - leftRating;
        }

        const leftReviews = this.getReviewCount(left._id);
        const rightReviews = this.getReviewCount(right._id);

        if (rightReviews !== leftReviews) {
          return rightReviews - leftReviews;
        }

        return left.title.localeCompare(right.title, 'es');
      }

      return left.title.localeCompare(right.title, 'es');
    });

    return result;
  });

  readonly pageTitle = computed(() => {
    if (this.searchQuery()) {
      return `Búsqueda: ${this.searchQuery()}`;
    }
    return this.selectedCategory() ? `Catálogo: ${this.selectedCategory()}` : 'Catálogo completo';
  });

  constructor() {
    this.loadProducts();
    this.loadReviews();
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.selectedCategory.set(params.get('categoria') ?? '');
      this.searchQuery.set(params.get('search') ?? '');
      this.selectedSort.set(this.normalizeSort(params.get('sort')));
    });
  }

  onCategoryChange(category: string): void {
    this.selectedCategory.set(category.trim());
    this.syncCatalogFiltersToUrl();
  }

  onSortChange(sort: string): void {
    this.selectedSort.set(this.normalizeSort(sort));
    this.syncCatalogFiltersToUrl();
  }

  clearFilters(): void {
    this.selectedCategory.set('');
    this.selectedSort.set('featured');
    this.searchQuery.set('');
    this.router.navigate(['/productos']);
  }

  getAverageRating(productId: string): number {
    const summary = this.reviewSummaryByProduct().get(productId);

    if (!summary || summary.count === 0) {
      return 0;
    }

    return summary.total / summary.count;
  }

  getReviewCount(productId: string): number {
    return this.reviewSummaryByProduct().get(productId)?.count ?? 0;
  }

  getRatingLabel(productId: string): string {
    const average = this.getAverageRating(productId);
    const count = this.getReviewCount(productId);

    if (count === 0) {
      return 'Sin valoraciones';
    }

    return `${average.toFixed(1)} / 5 (${count})`;
  }

  hasVariants(product: Product): boolean {
    return Array.isArray(product.variantes) && product.variantes.length > 0;
  }

  private getEffectivePrice(product: Product): number {
    return Number(product.sale_price ?? product.price ?? 0) || 0;
  }

  private loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (data) => {
        this.productList.set(data ?? []);
      },
      error: () => {
        this.productList.set([]);
      },
    });
  }

  private loadReviews(): void {
    this.reviewService.getAllReviews().subscribe({
      next: (reviews) => {
        this.reviews.set(reviews ?? []);
      },
      error: () => {
        this.reviews.set([]);
      },
    });
  }

  private syncCatalogFiltersToUrl(): void {
    this.router.navigate(['/productos'], {
      queryParams: this.catalogQueryParams(),
      replaceUrl: true,
    });
  }

  private normalizeSort(sort: string | null): SortOption {
    if (sort === 'price-asc' || sort === 'price-desc' || sort === 'rating-desc') {
      return sort;
    }

    return 'featured';
  }
}
