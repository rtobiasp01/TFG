import { Component, inject, signal } from '@angular/core';
import { UploadService } from '../../../services/upload-service';

@Component({
  selector: 'app-media',
  imports: [],
  templateUrl: './media.html',
  styleUrl: './media.css',
})
export class Media {
  private uploadService: UploadService = inject(UploadService);

  readonly archivos = signal<string[]>([]);

  constructor() {
    this.cargarArchivos();
  }

  eliminarArchivo(filename: string) {
    this.uploadService.eliminarArchivo(filename).subscribe({
      next: () => {
        this.archivos.update((items) => items.filter((item) => item !== filename));
      },
      error: (error) => {
        console.error('Error al eliminar archivo:', error);
      },
    });
  }

  private cargarArchivos() {
    this.uploadService.obtenerArchivos().subscribe({
      next: (response) => {
        this.archivos.set(response.files);
      },
      error: (error) => {
        console.error('Error al obtener archivos:', error);
      },
    });
  }

}
