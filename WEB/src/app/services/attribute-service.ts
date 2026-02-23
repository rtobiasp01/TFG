import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Attribute } from '../interfaces/attribute';

@Injectable({
  providedIn: 'root',
})
export class AttributeService {
  private http = inject(HttpClient);
  private readonly URL = 'http://localhost:3000/attributes';

  getAll() {
    return this.http.get<Attribute[]>(this.URL);
  }

  getByName(name: string) {
    return this.http.get<Attribute[]>(`${this.URL}/${name}`);
  }

  insertOne(data: any) {
    return this.http.post<Attribute>(this.URL, data);
  }

  insertValue(id: string, data: any) {
    return this.http.put<Attribute>(`${this.URL}/${id}`, data);
  }
}
