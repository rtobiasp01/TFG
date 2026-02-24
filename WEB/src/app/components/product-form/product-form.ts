import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../interfaces/product';
import { UploadService } from '../../services/upload-service';
import { AttributeService } from '../../services/attribute-service';
import { Attribute } from '../../interfaces/attribute';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';

// Imports de Angular Material
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

// Configuración centralizada
const API_BASE_URL = 'http://localhost:3000';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatAutocompleteModule, MatInputModule, MatFormFieldModule],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm {
  // Inyección de dependencias
  private readonly productService = inject(ProductService);
  private readonly uploadService = inject(UploadService);
  private readonly attributeService = inject(AttributeService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Estado del producto
  readonly id = signal<string>(this.route.snapshot.paramMap.get('id') || '');
  readonly productoActual = signal<Product | null>(null);
  readonly imagePath = signal<string>('');
  fileToUpload: File | null = null;

  // Estado de atributos
  readonly attributes = signal<Attribute[]>([]);

  // Formulario reactivo
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
    dim_l: [0, [Validators.min(0)]],
    dim_w: [0, [Validators.min(0)]],
    dim_h: [0, [Validators.min(0)]],
    weight: [0, [Validators.min(0)]],
    image: [''],
    attributeControl: [''],
    attributeValueControl: [''],
  });

  // Signals reactivos desde los controles del formulario
  private readonly attributeControlValue = toSignal(
    this.productForm.get('attributeControl')!.valueChanges,
    { initialValue: '' },
  );

  private readonly attributeValueControlValue = toSignal(
    this.productForm.get('attributeValueControl')!.valueChanges,
    { initialValue: '' },
  );

  // Computed Signals - Filtrado automático de atributos
  readonly attributeSelected = computed<Attribute[]>(() => {
    const searchValue = this.attributeControlValue()?.trim() || '';
    if (searchValue.length <= 1) return [];

    const regex = new RegExp(searchValue, 'i');
    return this.attributes().filter((attr) => regex.test(attr.name));
  });

  // Computed Signal - Verificar si el atributo ya existe
  readonly attributeExists = computed<boolean>(() => {
    const searchValue = this.attributeControlValue()?.trim() || '';
    if (!searchValue) return false;

    const existeExacto = this.attributes().some(
      (a) => a.name.toLowerCase() === searchValue.toLowerCase(),
    );
    return !existeExacto;
  });

  // Computed Signal - Valores del atributo seleccionado
  readonly attributeValueSelected = computed<string[]>(() => {
    const searchValue = this.attributeValueControlValue()?.trim() || '';
    const attributeName = this.attributeControlValue()?.trim() || '';

    if (searchValue.length <= 1 || !attributeName) return [];

    const selectedAttribute = this.attributes().find((a) => a.name === attributeName);
    if (!selectedAttribute?.values) return [];

    const regex = new RegExp(searchValue, 'i');
    return selectedAttribute.values.filter((v) => regex.test(v));
  });

  // Computed Signal - Verificar si el valor del atributo ya existe
  readonly attributeValueExists = computed<boolean>(() => {
    const searchValue = this.attributeValueControlValue()?.trim() || '';
    const attributeName = this.attributeControlValue()?.trim() || '';

    if (!searchValue || !attributeName) return false;

    const selectedAttribute = this.attributes().find((a) => a.name === attributeName);
    if (!selectedAttribute?.values) return false;

    const existeExacto = selectedAttribute.values.some(
      (v) => v.toLowerCase() === searchValue.toLowerCase(),
    );
    return !existeExacto;
  });

  constructor() {
    // Cargar producto si estamos en modo edición
    if (this.id()) {
      this.productService.getById(this.id()).subscribe({
        next: (product: Product) => {
          this.productoActual.set(product);
          this.imagePath.set(product.image || '');
          this.productForm.patchValue(product);
        },
        error: (err) => console.error('Error al cargar producto:', err),
      });
    }

    // Cargar todos los atributos disponibles
    this.attributeService.getAll().subscribe({
      next: (attributes: Attribute[]) => this.attributes.set(attributes),
      error: (err) => console.error('Error al cargar atributos:', err),
    });
  }

  // MÉTODOS DE SELECCIÓN (limpiar inputs al seleccionar)
  onAttributeSelected(selectedValue: string): void {
    this.productForm.patchValue({ attributeControl: selectedValue });
  }

  onAttributeValueSelected(selectedValue: string): void {
    const attributeName = this.attributeControlValue()?.trim();
    const attributeValue = selectedValue.trim();

    if (!attributeName || !attributeValue) return;

    // Inicializar productoActual si es null (modo creación)
    if (!this.productoActual()) {
      this.productoActual.set({
        _id: '',
        title: '',
        price: 0,
        description: '',
        sku: '',
        stock_quantity: 0,
        dimensions: { l: 0, w: 0, h: 0, weight: 0 },
        image: '',
        attributes: [],
      });
    }

    const currentProduct = this.productoActual()!;
    const existingAttributeIndex = currentProduct.attributes.findIndex(
      (attr) => attr.name.toLowerCase() === attributeName.toLowerCase(),
    );

    if (existingAttributeIndex !== -1) {
      // El atributo ya existe, añadir el valor si no está ya incluido
      const updatedAttributes = [...currentProduct.attributes];
      const existingAttribute = updatedAttributes[existingAttributeIndex];

      if (!existingAttribute.values.includes(attributeValue)) {
        updatedAttributes[existingAttributeIndex] = {
          ...existingAttribute,
          values: [...existingAttribute.values, attributeValue],
        };

        this.productoActual.set({
          ...currentProduct,
          attributes: updatedAttributes,
        });
      }
    } else {
      // El atributo no existe, crear uno nuevo
      const newAttribute: Attribute = {
        _id: '', // Se generará en el backend o no es necesario para nuevos
        name: attributeName,
        values: [attributeValue],
      };

      this.productoActual.set({
        ...currentProduct,
        attributes: [...currentProduct.attributes, newAttribute],
      });
    }

    // Limpiar los controles del formulario
    this.productForm.patchValue({
      attributeControl: '',
      attributeValueControl: '',
    });
  }

  // MÉTODOS DE CREACIÓN - Refactorizados con switchMap para evitar callback hell
  nuevoAtributo(nombre: string): void {
    this.attributeService
      .insertOne({ name: nombre, values: [] })
      .pipe(
        switchMap(() => this.attributeService.getAll()),
        tap((attributes: Attribute[]) => this.attributes.set(attributes)),
      )
      .subscribe({
        error: (err) => console.error('Error al crear atributo:', err),
      });
  }

  nuevoAtributoValue(nombre: string): void {
    const attributeName = this.attributeControlValue()?.trim();
    if (!attributeName) return;

    const selectedAttribute = this.attributes().find(
      (a) => a.name.toLowerCase() === attributeName.toLowerCase(),
    );

    if (!selectedAttribute?._id) return;

    this.attributeService
      .insertValue(selectedAttribute._id, { value: nombre })
      .pipe(
        switchMap(() => this.attributeService.getAll()),
        tap((attributes: Attribute[]) => this.attributes.set(attributes)),
      )
      .subscribe({
        error: (err) => console.error('Error al añadir valor:', err),
      });
  }

  // MÉTODOS DE ENVÍO DEL FORMULARIO
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
    } else {
      this.enviarFormularioFinal();
    }
  }

  private enviarFormularioFinal(): void {
    // Desestructurar para excluir campos auxiliares
    const { attributeControl, attributeValueControl, ...productData } =
      this.productForm.getRawValue();

    // Normalizar atributos: eliminar _id vacíos y mantener solo name y values
    const cleanAttributes =
      this.productoActual()?.attributes.map((attr) => ({
        name: attr.name,
        values: attr.values,
      })) || [];

    // Construir payload limpio
    const payload = {
      ...productData,
      attributes: cleanAttributes,
    };

    const operation$ = this.id()
      ? this.productService.update(this.id(), payload)
      : this.productService.create(payload);

    operation$.subscribe({
      next: () => this.router.navigate(['home']),
      error: (err) => console.error('Error al guardar producto:', err),
    });
  }

  // MÉTODOS DE UTILIDAD
  getRandomColor(): string {
    const randomHex = Math.floor(Math.random() * 16777215).toString(16);
    return `#${randomHex.padStart(6, '0')}`;
  }

  removeValue(attr: Attribute, value: string): void {
    if (!this.productoActual()) return;

    const currentProduct = this.productoActual()!;
    const updatedAttributes = currentProduct.attributes
      .map((attribute) => {
        if (attribute.name === attr.name) {
          return {
            ...attribute,
            values: attribute.values.filter((v) => v !== value),
          };
        }
        return attribute;
      })
      .filter((attribute) => attribute.values.length > 0); // Eliminar atributos sin valores

    this.productoActual.set({
      ...currentProduct,
      attributes: updatedAttributes,
    });
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
