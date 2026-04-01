import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Category } from '../interfaces/category';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/categories';

  getAll() {
    return this.http.get<Category[]>(this.API_URL);
  }

  getById(id: string) {
    return this.http.get<Category>(`${this.API_URL}/${id}`);
  }

  create(category: any) {
    return this.http.post<Category>(this.API_URL, category);
  }

  update(id: string, category: any) {
    return this.http.put<Category>(`${this.API_URL}/${id}`, category);
  }

  delete(id: string) {
    return this.http.delete<Category>(`${this.API_URL}/${id}`);
  }
}
