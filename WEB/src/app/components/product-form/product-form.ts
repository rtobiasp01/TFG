import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../interfaces/product';
import { UploadService } from '../../services/upload-service';
import { AttributeService } from '../../services/attribute-service';
import { Attribute } from '../../interfaces/attribute';

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
  private attributeService = inject(AttributeService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Signals para estado reactivo
  id = signal<string>('');
  productoActual = signal<Product | null>(null);
  imagePath = signal<string>('');
  attributeSelected = signal<Attribute[]>([]);
  attributeValueSelected = signal<string[]>([]);
  attributeExists = signal<boolean>(true);
  attributeValueExists = signal<boolean>(true);

  // Estado compartido
  attributes = signal<Attribute[]>([]);
  fileToUpload: File | null = null;

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
    attributeControl: [''],
    attributeValueControl: [''],
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
      this.attributeService.getAll().subscribe({
        next: (res) => this.attributes.set(res),
      });
    }
  }

  // MÉTODOS DE BÚSQUEDA
  buscarAtributos(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    if (value.length > 1) {
      const regex = new RegExp(value, 'i');
      const filteredAttributes = this.attributes().filter((attribute) =>
        regex.test(attribute.name),
      );
      this.attributeSelected.set(filteredAttributes);

      const existeExacto = this.attributes().some(
        (a) => a.name.toLowerCase() === value.toLowerCase(),
      );
      this.attributeExists.set(!existeExacto);
    } else {
      this.attributeSelected.set([]);
      this.attributeExists.set(false);
    }
  }

  buscarValoresAtributo(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    if (value.length > 1) {
      const regex = new RegExp(value, 'i');
      const valoresDisponibles = this.attributes().find(
        (a) => a.name === this.productForm.get('attributeControl')?.value,
      )?.values;

      if (valoresDisponibles) {
        const valoresFiltrados = valoresDisponibles.filter((v) => regex.test(v));

        this.attributeValueSelected.set(valoresFiltrados);

        const existeExacto = valoresFiltrados.some((a) => a.toLowerCase() === value.toLowerCase());
        this.attributeValueExists.set(!existeExacto);
      }
    } else {
      this.attributeValueSelected.set([]);
      this.attributeValueExists.set(false);
    }
  }

  // MÉTODOS DE SELECCIÓN Y VALIDACIÓN
  onAttributeSelected(selectedValue: string): void {
    const existeExacto = this.attributes().some(
      (a) => a.name.toLowerCase() === selectedValue.toLowerCase(),
    );
    this.attributeExists.set(!existeExacto);
    this.attributeSelected.set([]);
  }

  onAttributeValueSelected(selectedValue: string) {
    const valoresDisponibles = this.attributes().find(
      (a) => a.name === this.productForm.get('attributeControl')?.value,
    )?.values;

    if (valoresDisponibles) {
      const existeExacto = valoresDisponibles.some(
        (a) => a.toLowerCase() === selectedValue.toLowerCase(),
      );

      const attribute = 

      this.attributeValueExists.set(!existeExacto);
      this.attributeValueSelected.set([]);
    }
  }

  validarSeleccion() {
    const valor = this.productForm.get('attributeControl')?.value;
    const existe = this.attributeSelected().some((a) => a.name === valor);
    if (!existe && valor !== '') {
      this.productForm.get('attributeControl')?.setValue('');
      this.attributeExists.set(false);
    }
  }

  // MÉTODOS DE CREACIÓN
  nuevoAtributo(nombre: string) {
    this.attributeService.insertOne({ name: nombre, values: [] }).subscribe({
      next: () => {
        this.attributeService.getAll().subscribe({
          next: (data) => {
            this.attributes.set(data);
            this.attributeExists.set(false);
            const value = this.productForm.get('attributeControl')?.value;
            if (value) {
              const regex = new RegExp(value, 'i');
              const filteredAttributes = this.attributes().filter((attribute) =>
                regex.test(attribute.name),
              );
              this.attributeSelected.set(filteredAttributes);
            }
          },
        });
      },
    });
  }

  nuevoAtributoValue(nombre: string) {
    const attributeName = this.productForm.get('attributeControl')?.value;
    if (attributeName) {
      const selectedAttribute = this.attributes().find(
        (a) => a.name.toLowerCase() === attributeName.toLowerCase(),
      );

      if (selectedAttribute) {
        this.attributeService.insertValue(selectedAttribute._id, { value: nombre }).subscribe({
          next: () => {
            this.attributeService.getAll().subscribe({
              next: (data) => {
                this.attributes.set(data);

                this.attributeValueExists.set(false);

                const value = this.productForm.get('attributeValueControl')?.value;
                if (value) {
                  const regex = new RegExp(value, 'i');
                  const updatedValues =
                    data.find((a) => a._id === selectedAttribute._id)?.values || [];

                  const filteredValues = updatedValues.filter((v) => regex.test(v));
                  this.attributeValueSelected.set(filteredValues);
                }
              },
            });
          },
          error: (err) => console.error('Error al añadir valor:', err),
        });
      }
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
    this.productService.update(this.id(), this.productoActual()).subscribe();
  }

  // MÉTODOS DE UTILIDAD
  getRandomColor(index: number): string {
    const colors = [
      '#3182ce',
      '#38a169',
      '#e53e3e',
      '#d69e2e',
      '#805ad5',
      '#dd6b20',
      '#319795',
      '#d53f8c',
    ];
    return colors[index % colors.length];
  }

  removeValue(attr: any, value: string) {
    attr.values = attr.values.filter((v: string) => v !== value);
  }

  // MÉTODOS DE ARCHIVO
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.fileToUpload = file;
      this.imagePath.set(URL.createObjectURL(file));
    }
  }
}
