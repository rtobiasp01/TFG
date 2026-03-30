import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../interfaces/product';
import { UploadService } from '../../services/upload-service';

const API_BASE_URL = 'http://localhost:3000';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm {
  private readonly productService = inject(ProductService);
  private readonly uploadService = inject(UploadService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly id = signal<string>(this.route.snapshot.paramMap.get('id') || '');
  readonly imagePath = signal<string>('');
  fileToUpload: File | null = null;

  readonly productForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    short_description: [''],
    type: ['simple', Validators.required],
    slug: [''],
    price: [0, [Validators.required, Validators.min(0.01)]],
    sku: ['', Validators.required],
    stock_status: ['in_stock', Validators.required],
    stock_quantity: [0, [Validators.min(0)]],
    manage_stock: [false],
    physical_attributes: this.fb.group({
      length: [0, [Validators.min(0)]],
      width: [0, [Validators.min(0)]],
      height: [0, [Validators.min(0)]],
      weight: [0, [Validators.min(0)]],
    }),
    image: [''],
  });

  constructor() {
    if (this.id()) {
      this.productService.getById(this.id()).subscribe({
        next: (product: Product) => {
          this.imagePath.set(product.image || '');
          this.productForm.patchValue(product);
        },
        error: (err) => console.error('Error al cargar producto:', err),
      });
    }
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      alert('Por favor rellena los campos obligatorios');
      return;
    }

    if (this.fileToUpload) {
      this.uploadService.subirArchivo(this.fileToUpload).subscribe({
        next: (res: any) => {
          const imagePath = `${API_BASE_URL}/${res.fileDetails.path}`;
          this.productForm.patchValue({ image: imagePath });
          this.enviarFormularioFinal();
        },
        error: (err) => {
          console.error('Error al subir imagen:', err);
          alert('Error al subir la imagen.');
        },
      });
      return;
    }

    this.enviarFormularioFinal();
  }

  private enviarFormularioFinal(): void {
    const payload = this.productForm.getRawValue();

    const operation$ = this.id()
      ? this.productService.update(this.id(), payload)
      : this.productService.create(payload);

    operation$.subscribe({
      next: () => this.router.navigate(['home']),
      error: (err) => console.error('Error al guardar producto:', err),
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.fileToUpload = file;
      this.imagePath.set(URL.createObjectURL(file));
    }
  }
}
