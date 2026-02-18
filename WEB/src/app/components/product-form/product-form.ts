import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { ProductService } from '../../services/product-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../interfaces/product';
import { UploadService } from '../../services/upload-service';
import { AtributeService } from '../../services/atribute-service';
import { Atribute } from '../../interfaces/atribute';

// Imports de Angular Material
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatAutocompleteModule, MatInputModule, MatFormFieldModule],
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
  atributeSelected = signal<Atribute[]>([]);
  imagePath = signal<string>('');
  fileToUpload: File | null = null;

  // Control para el buscador de atributos
  atributeControl = new FormControl('');

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
        next: (res) => (this.atributes = res),
      });
    }
  }

  // Lógica de búsqueda mejorada
  buscarAtributos(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    if (value.length > 1) {
      const regex = new RegExp(value, 'i');

      const filteredAtributes = this.atributes.filter((atribute) => regex.test(atribute.name));

      this.atributeSelected.set(filteredAtributes);

      const existeExacto = this.atributes.some((a) => a.name.toLowerCase() === value.toLowerCase());

      this.attributeExists.set(!existeExacto);
    } else {
      this.atributeSelected.set([]);
      this.attributeExists.set(false);
    }
  }

  attributeExists = signal<boolean>(true);
  validarSeleccion() {
    const valor = this.atributeControl.value;
    const existe = this.atributeSelected().some((a) => a.name === valor);
    if (!existe && valor !== '') {
      this.atributeControl.setValue('');
      this.attributeExists.set(false);
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
          alert('Error al subir la imagen.');
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
    this.productService.create(data).subscribe();
  }

  actualizar(data: any): void {
    this.productService.update(this.id(), data).subscribe();
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
