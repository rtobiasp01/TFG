import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface NewsletterResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NewsletterService {
  private readonly apiUrl = 'http://localhost:3000/newsletter';

  constructor(private readonly http: HttpClient) {}

  subscribe(email: string): Observable<NewsletterResponse> {
    return this.http.post<NewsletterResponse>(this.apiUrl, { email });
  }
}
