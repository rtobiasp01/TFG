import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../interfaces/product';
import { UploadService } from '../../services/upload-service';
import { Variant } from '../../interfaces/variant';

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
  readonly showLogisticsTab = signal<boolean>(true);
  readonly showVariantsTab = signal<boolean>(false);
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
    variantes: this.fb.array([]),
    image: [''],
  });

  get variantesFormArray(): FormArray<FormGroup> {
    return this.productForm.get('variantes') as FormArray<FormGroup>;
  }

  variantesControls() {
    return this.variantesFormArray.controls;
  }

  constructor() {
    if (this.id()) {
      this.productService.getById(this.id()).subscribe({
        next: (product: Product) => {
          this.imagePath.set(product.image || '');
          this.patchProductInForm(product);
          this.updateTabsByProductType(product.type);
          this.updateStockQuantityState(product.manage_stock ?? false);
        },
        error: (err) => console.error('Error al cargar producto:', err),
      });
      return;
    }

    this.updateTabsByProductType(this.productForm.get('type')?.value ?? 'simple');
    this.updateStockQuantityState(false);
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
    const rawValue = this.productForm.getRawValue();
    const payload: any = {
      ...rawValue,
      stock_quantity: rawValue.manage_stock ? Number(rawValue.stock_quantity) || 0 : 0,
      variantes: this.buildVariantsPayload(rawValue.variantes ?? []),
    };

    if (rawValue.type !== 'simple') {
      payload.physical_attributes = null;
    }

    if (rawValue.type !== 'variable') {
      payload.variantes = [];
    }

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

  onProductTypeSelected(event: Event): void {
    const input = event.target as HTMLSelectElement;
    this.updateTabsByProductType(input.value);
  }

  private updateTabsByProductType(type: string): void {
    this.showLogisticsTab.set(type === 'simple');
    this.showVariantsTab.set(type === 'variable');

    if (type === 'variable' && this.variantesFormArray.length === 0) {
      this.addVariant();
    }
  }

  onManageStockChange(): void {
    const manageStock = this.productForm.get('manage_stock')?.value ?? false;
    this.updateStockQuantityState(manageStock);
  }

  private updateStockQuantityState(manageStock: boolean): void {
    const stockQuantityControl = this.productForm.get('stock_quantity');
    if (manageStock) {
      stockQuantityControl?.enable();
    } else {
      stockQuantityControl?.setValue(0);
      stockQuantityControl?.disable();
    }
  }

  addVariant(variant?: Variant): void {
    const variantGroup = this.fb.group({
      stock: [variant?.stock ?? 0, [Validators.min(0)]],
      precio_adicional: [variant?.precio_adicional ?? 0, [Validators.min(0)]],
      imagenes_text: [Array.isArray(variant?.imagenes) ? variant.imagenes.join(', ') : ''],
      attributes: this.fb.array([]),
      has_custom_physical_attributes: [Boolean(variant?.physical_attributes)],
      physical_attributes: this.fb.group({
        length: [this.getPhysicalAttributeValue(variant?.physical_attributes, 'length', 0), [Validators.min(0)]],
        width: [this.getPhysicalAttributeValue(variant?.physical_attributes, 'width', 0), [Validators.min(0)]],
        height: [this.getPhysicalAttributeValue(variant?.physical_attributes, 'height', 0), [Validators.min(0)]],
        weight: [this.getPhysicalAttributeValue(variant?.physical_attributes, 'weight', 0), [Validators.min(0)]],
      }),
    });

    this.variantesFormArray.push(variantGroup);

    const variantIndex = this.variantesFormArray.length - 1;
    const dynamicAttributes = this.extractDynamicAttributes(variant);

    if (dynamicAttributes.length === 0) {
      this.addVariantAttribute(variantIndex);
      return;
    }

    dynamicAttributes.forEach(({ key, value }) => {
      this.addVariantAttribute(variantIndex, key, String(value));
    });
  }

  removeVariant(index: number): void {
    this.variantesFormArray.removeAt(index);
  }

  variantAttributesControls(variantIndex: number) {
    return this.getVariantAttributesFormArray(variantIndex).controls;
  }

  addVariantAttribute(variantIndex: number, key = '', value = ''): void {
    this.getVariantAttributesFormArray(variantIndex).push(
      this.fb.group({
        key: [key, Validators.required],
        value: [value, Validators.required],
      }),
    );
  }

  removeVariantAttribute(variantIndex: number, attributeIndex: number): void {
    this.getVariantAttributesFormArray(variantIndex).removeAt(attributeIndex);
  }

  private patchProductInForm(product: Product): void {
    const { variantes, physical_attributes, ...productWithoutVariants } = product;
    this.productForm.patchValue({
      ...productWithoutVariants,
      physical_attributes:
        physical_attributes ?? {
          length: 0,
          width: 0,
          height: 0,
          weight: 0,
        },
    });

    this.variantesFormArray.clear();
    if (Array.isArray(variantes)) {
      variantes.forEach((variant) => this.addVariant(variant));
    }
  }

  private buildVariantsPayload(rawVariants: any[]): Variant[] {
    if (!Array.isArray(rawVariants)) {
      return [];
    }

    return rawVariants.map((rawVariant) => {
      const variantPayload: Variant = {
        ...this.buildDynamicAttributes(rawVariant.attributes ?? []),
        stock: Number(rawVariant.stock) || 0,
        precio_adicional: Number(rawVariant.precio_adicional) || 0,
        imagenes: this.parseImages(rawVariant.imagenes_text),
      };

      if (rawVariant.has_custom_physical_attributes) {
        variantPayload.physical_attributes = {
          length: Number(rawVariant.physical_attributes?.length) || 0,
          width: Number(rawVariant.physical_attributes?.width) || 0,
          height: Number(rawVariant.physical_attributes?.height) || 0,
          weight: Number(rawVariant.physical_attributes?.weight) || 0,
        };
      }

      return variantPayload;
    });
  }

  private getVariantAttributesFormArray(variantIndex: number): FormArray<FormGroup> {
    return this.variantesFormArray.at(variantIndex).get('attributes') as FormArray<FormGroup>;
  }

  private extractDynamicAttributes(variant?: Variant): Array<{ key: string; value: string | number }> {
    if (!variant) {
      return [];
    }

    const reservedKeys = new Set([
      'sku',
      'stock',
      'precio_adicional',
      'imagenes',
      'physical_attributes',
      'attributes',
    ]);

    const dynamicAttributes: Array<{ key: string; value: string | number }> = [];

    Object.entries(variant).forEach(([key, value]) => {
      if (reservedKeys.has(key) || value === null || value === undefined || typeof value === 'object') {
        return;
      }

      dynamicAttributes.push({ key, value: value as string | number });
    });

    if (variant.attributes && typeof variant.attributes === 'object') {
      Object.entries(variant.attributes).forEach(([key, value]) => {
        if (key && value !== null && value !== undefined) {
          dynamicAttributes.push({ key, value });
        }
      });
    }

    return dynamicAttributes;
  }

  private buildDynamicAttributes(rawAttributes: any[]): Record<string, string | number> {
    if (!Array.isArray(rawAttributes)) {
      return {};
    }

    return rawAttributes.reduce((acc, attribute) => {
      const rawKey = String(attribute?.key ?? '').trim();
      const rawValue = String(attribute?.value ?? '').trim();

      if (!rawKey || !rawValue) {
        return acc;
      }

      acc[rawKey] = this.parseDynamicAttributeValue(rawValue);
      return acc;
    }, {} as Record<string, string | number>);
  }

  private parseDynamicAttributeValue(value: string): string | number {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && value !== '' ? parsedValue : value;
  }

  private parseImages(rawImages: string): string[] {
    return rawImages
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private getPhysicalAttributeValue(
    physicalAttributes: Variant['physical_attributes'],
    key: 'length' | 'width' | 'height' | 'weight',
    fallback: number,
  ): number {
    const value = physicalAttributes && typeof physicalAttributes === 'object' ? (physicalAttributes as any)[key] : fallback;
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

}
