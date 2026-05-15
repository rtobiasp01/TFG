import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../../services/review-service';
import { Review } from '../../../interfaces/review';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.html',
  styleUrl: './reviews.css',
})
export class Reviews {
  private readonly reviewService = inject(ReviewService);

  readonly reviews = signal<Review[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');

  readonly newReview = signal<Review>({
    email: '',
    product_id: '',
    message: '',
    rating: 5,
  });

  readonly showForm = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  constructor() {
    this.loadAllReviews();
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

  onSubmitReview(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.reviewService.createReview(this.newReview()).subscribe({
      next: (response) => {
        this.successMessage.set('Reseña creada exitosamente');
        this.resetForm();
        this.loadAllReviews();
        this.isSubmitting.set(false);

        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.error || 'Error al crear la reseña. Intenta de nuevo.');
        this.isSubmitting.set(false);
        console.error('Error creating review:', error);
      },
    });
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

  toggleForm(): void {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.newReview.set({
      email: '',
      product_id: '',
      message: '',
      rating: 5,
    });
    this.showForm.set(false);
  }

  getRatingStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  isStarFilled(star: number, rating: number): boolean {
    return star <= rating;
  }
}
