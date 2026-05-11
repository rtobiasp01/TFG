import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Review } from '../interfaces/review';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private http = inject(HttpClient);
  private readonly API_BASE_URL = 'http://localhost:3000/reviews';

  getAllReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(this.API_BASE_URL);
  }

  getReviewsByProductId(productId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.API_BASE_URL}/product/${productId}`);
  }

  createReview(review: Review): Observable<any> {
    return this.http.post<any>(this.API_BASE_URL, review);
  }

  deleteReview(reviewId: string): Observable<any> {
    return this.http.delete<any>(`${this.API_BASE_URL}/${reviewId}`);
  }
}
