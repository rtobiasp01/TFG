import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface UploadResponse {
  message: string;
  fileDetails: unknown;
}

export interface BackgroundRemovalResponse {
  message: string;
  fileDetails: unknown;
  processedFile: string;
  processedFileUrl: string;
  format?: 'png' | 'deltapng';
}

export interface UploadFilesResponse {
  message: string;
  files: string[];
}

export interface DeleteUploadResponse {
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private http = inject(HttpClient);
  private readonly URL = 'http://localhost:3000/upload';

  subirArchivo(archivo: File) {
    const formData = new FormData();

    formData.append('archivo', archivo);

    return this.http.post<UploadResponse>(this.URL, formData);
  }

  subirArchivoSinFondo(archivo: File, useDeltaPng: boolean = false) {
    const formData = new FormData();

    formData.append('archivo', archivo);

    let url = `${this.URL}/remove-background`;
    if (useDeltaPng) {
      url += '?format=deltapng';
    }

    return this.http.post<BackgroundRemovalResponse>(url, formData);
  }

  obtenerArchivos() {
    return this.http.get<UploadFilesResponse>(this.URL);
  }

  eliminarArchivo(filename: string) {
    const safeFilename = encodeURIComponent(filename);
    return this.http.delete<DeleteUploadResponse>(`${this.URL}/${safeFilename}`);
  }
}
