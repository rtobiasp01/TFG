import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Atribute } from '../interfaces/atribute';

@Injectable({
  providedIn: 'root',
})
export class AtributeService {
  private http = inject(HttpClient);
  private readonly URL = 'http://localhost:3000/atributes';

  getAll() {
    return this.http.get<Atribute[]>(this.URL);
  }

  getByName(name: string) {
    return this.http.get<Atribute[]>(`${this.URL}/${name}`);
  }

  insertOne(data: any) {
    return this.http.post<Atribute>(this.URL, data);
  }
}
