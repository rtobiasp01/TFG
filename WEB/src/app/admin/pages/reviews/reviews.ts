import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../../services/review-service';
import { ProductService } from '../../../services/product-service';
import { Review } from '../../../interfaces/review';
import { Product } from '../../../interfaces/product';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.html',
  styleUrl: './reviews.css',
})
export class AdminReviews implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly productService = inject(ProductService);

  readonly reviews = signal<Review[]>([]);
  readonly products = signal<Map<string, Product>>(new Map());
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');

  readonly sortBy = signal<'date' | 'rating'>('date');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');
  readonly filterByRating = signal<number | null>(null);

  ngOnInit(): void {
    this.loadAllReviews();
    this.loadAllProducts();
  }

  private loadAllReviews(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.reviewService.getAllReviews().subscribe({
      next: (reviews) => {
        this.reviews.set(reviews);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Error al cargar las reseñas');
        this.isLoading.set(false);
        console.error('Error loading reviews:', error);
      },
    });
  }

  private loadAllProducts(): void {
    this.productService.getAll().subscribe({
      next: (products) => {
        const productMap = new Map<string, Product>();
        products.forEach((product) => {
          productMap.set(product._id, product);
        });
        this.products.set(productMap);
      },
      error: (error) => {
        console.error('Error loading products:', error);
      },
    });
  }

  getProductName(productId: string): string {
    return this.products().get(productId)?.title || `Producto: ${productId}`;
  }

  onDeleteReview(reviewId: string | undefined): void {
    if (!reviewId) return;

    if (confirm('¿Estás seguro de que deseas eliminar esta reseña?')) {
      this.reviewService.deleteReview(reviewId).subscribe({
        next: () => {
          this.successMessage.set('Reseña eliminada exitosamente');
          this.loadAllReviews();

          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          this.errorMessage.set('Error al eliminar la reseña');
          console.error('Error deleting review:', error);
        },
      });
    }
  }

  getSortedAndFilteredReviews(): Review[] {
    let filtered = [...this.reviews()];

    if (this.filterByRating() !== null) {
      filtered = filtered.filter((review) => review.rating === this.filterByRating());
    }

    filtered.sort((a, b) => {
      let comparison = 0;

      if (this.sortBy() === 'date') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        comparison = dateA - dateB;
      } else {
        comparison = a.rating - b.rating;
      }

      return this.sortOrder() === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }

  getRatingStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  isStarFilled(star: number, rating: number): boolean {
    return star <= rating;
  }

  changeSortBy(newSort: 'date' | 'rating'): void {
    if (this.sortBy() === newSort) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(newSort);
      this.sortOrder.set('desc');
    }
  }

  updateFilter(value: number | null): void {
    this.filterByRating.set(value);
  }

  getAverageRating(): number {
    if (this.reviews().length === 0) return 0;
    const sum = this.reviews().reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / this.reviews().length) * 10) / 10;
  }

  getTotalReviews(): number {
    return this.reviews().length;
  }

  getRatingDistribution(): { rating: number; count: number }[] {
    const distribution: { rating: number; count: number }[] = [
      { rating: 5, count: 0 },
      { rating: 4, count: 0 },
      { rating: 3, count: 0 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 },
    ];

    this.reviews().forEach((review) => {
      const ratingDistribution = distribution.find((d) => d.rating === review.rating);
      if (ratingDistribution) {
        ratingDistribution.count++;
      }
    });

    return distribution;
  }
}
