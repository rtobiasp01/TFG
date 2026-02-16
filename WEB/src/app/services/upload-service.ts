import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private http = inject(HttpClient);
  private readonly URL = 'http://localhost:3000/upload';

  subirArchivo(archivo: File) {
    const formData = new FormData();

    // IMPORTANTE: El primer argumento "archivo" debe coincidir
    // exactamente con upload.single("archivo") en tu backend.
    formData.append('archivo', archivo);

    return this.http.post(this.URL, formData);
  }
}
