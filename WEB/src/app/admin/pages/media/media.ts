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
  readonly selectedImage = signal<string>('');
  readonly showImageModal = signal<boolean>(false);

  readonly uploadBaseUrl = 'http://localhost:3000/uploads/';

  constructor() {
    this.cargarArchivos();
  }

  getImageUrl(filename: string): string {
    return `${this.uploadBaseUrl}${encodeURIComponent(filename)}`;
  }

  isVideoFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase().split('?')[0];
    return ext === 'mp4' || ext === 'webm' || ext === 'ogg' || ext === 'mov' || ext === 'avi';
  }

  openImageModal(filename: string): void {
    this.selectedImage.set(this.getImageUrl(filename));
    this.showImageModal.set(true);
  }

  closeImageModal(): void {
    this.showImageModal.set(false);
  }

  eliminarArchivo(filename: string) {
    this.uploadService.eliminarArchivo(filename).subscribe({
      next: () => {
        this.archivos.update((items) => items.filter((item) => item !== filename));
        if (this.selectedImage().endsWith(encodeURIComponent(filename))) {
          this.closeImageModal();
          this.selectedImage.set('');
        }
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
