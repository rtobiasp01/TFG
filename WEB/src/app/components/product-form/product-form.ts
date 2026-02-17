import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product-service';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../interfaces/product';
import { UploadService } from '../../services/upload-service';
import { Router } from '@angular/router';
import { AtributeService } from '../../services/atribute-service';
import { Atribute } from '../../interfaces/atribute';
@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm {
  private productService = inject(ProductService);
  private uploadService = inject(UploadService);
  private atributeService = inject(AtributeService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  id = signal<string>('');
  productoActual = signal<Product | null>(null);

  atributes: Atribute[] = [];
  atributeValues = signal<Atribute[]>([]);

  productForm = this.fb.group({
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
    dim_l: [0, [Validators.min(0)]],
    dim_w: [0, [Validators.min(0)]],
    dim_h: [0, [Validators.min(0)]],
    weight: [0, [Validators.min(0)]],
    image: [''],
  });

  constructor() {
    const idProducto = this.route.snapshot.paramMap.get('id');

    if (idProducto) {
      this.id.set(idProducto);

      this.productService.getById(this.id()).subscribe((product) => {
        this.productoActual.set(product);
        this.imagePath.set(product.image);

        if (product) {
          this.productForm.patchValue(product);
          this.productForm.patchValue({
            dim_h: product.dimensions.h,
            dim_l: product.dimensions.l,
            dim_w: product.dimensions.w,
            weight: product.dimensions.weight,
          });
        }
      });

      this.atributeService.getAll().subscribe({
        next: (value) => (this.atributes = value),
        error: (err) => console.error('Observable emitted an error: ' + err),
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
          const file = res.fileDetails;

          this.productForm.patchValue({
            image: 'http://localhost:3000/' + file.path,
          });

          this.enviarFormularioFinal();
        },
        error: (err) => {
          console.error('Error al subir', err);
          alert('Hubo un error al subir la imagen. No se pudo guardar el producto.');
        },
      });
    } else {
      this.enviarFormularioFinal();
    }
  }

  private enviarFormularioFinal(): void {
    const payload = this.productForm.getRawValue();

    if (this.id()) {
      this.actualizar(payload);
    } else {
      this.guardar(payload);
    }

    this.router.navigate(['home']);
  }

  guardar(data: any): void {
    this.productService.create(data).subscribe((response) => {
      console.log(response);
    });
  }

  actualizar(data: any): void {
    this.productService.update(this.id(), data).subscribe((response) => {
      console.log(response);
    });
  }

  imagePath = signal<string>('');
  fileToUpload: File | null = null;
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      this.fileToUpload = file;

      const relativePath = URL.createObjectURL(file);
      this.imagePath.set(relativePath);
    }
  }

  subirImagen() {
    if (this.fileToUpload) {
      this.uploadService.subirArchivo(this.fileToUpload).subscribe({
        next: (res: any) => {
          let file = res.fileDetails;

          this.productForm.patchValue({
            image: file.path,
          });
        },
        error: (err) => console.error('Error al subir', err),
      });
    }
  }

  changeAtributeValues(event: Event) {
    const element = event.target as HTMLSelectElement;
    const valor = element.value;

    this.atributeService.getByName(valor).subscribe({
      next: (listado) => this.atributeValues.set(listado),
      error: (err) => console.log(err),
    });
  }
}
