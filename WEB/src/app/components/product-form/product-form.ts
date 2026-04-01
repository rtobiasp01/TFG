import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../interfaces/product';
import { UploadService } from '../../services/upload-service';
import { CategoryService } from '../../services/category-service';
import { Variant } from '../../interfaces/variant';
import { Category } from '../../interfaces/category';
import { CommonModule } from '@angular/common';

const API_BASE_URL = 'http://localhost:3000';
type ImagePickerTarget = 'main' | 'gallery' | 'variant';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm {
  private readonly productService = inject(ProductService);
  private readonly uploadService = inject(UploadService);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly id = signal<string>(this.route.snapshot.paramMap.get('id') || '');
  readonly imagePath = signal<string>('');
  readonly galeryPaths = signal<string[]>([]);
  readonly showLogisticsTab = signal<boolean>(true);
  readonly showVariantsTab = signal<boolean>(false);
  readonly categories = signal<Category[]>([]);
  readonly selectedCategories = signal<Set<string>>(new Set());
  readonly variantImagePreviews = signal<Map<number, string[]>>(new Map());
  readonly uploadedFiles = signal<string[]>([]);
  readonly showImagePickerModal = signal<boolean>(false);
  readonly imagePickerTarget = signal<ImagePickerTarget>('main');
  readonly activeVariantIndex = signal<number | null>(null);
  fileToUpload: File | null = null;
  galeryToUpload: File[] | null = null;
  variantFilesToUpload: Map<number, File[]> = new Map();

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
    gallery: [[] as string[]],
  });

  get variantesFormArray(): FormArray<FormGroup> {
    return this.productForm.get('variantes') as FormArray<FormGroup>;
  }

  variantesControls() {
    return this.variantesFormArray.controls;
  }

  constructor() {
    this.loadCategories();
    this.loadUploadedFiles();

    if (this.id()) {
      this.productService.getById(this.id()).subscribe({
        next: (product: Product) => {
          this.imagePath.set(product.image || '');
          this.galeryPaths.set(Array.isArray(product.gallery) ? product.gallery : []);
          this.selectedCategories.set(new Set(product.categoria || []));
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

  private loadCategories() {
    this.categoryService.getAll().subscribe({
      next: (data) => this.categories.set(data),
      error: (err) => console.error('Error al cargar categorías:', err),
    });
  }

  private loadUploadedFiles() {
    this.uploadService.obtenerArchivos().subscribe({
      next: (response) => this.uploadedFiles.set(response.files || []),
      error: (err) => console.error('Error al cargar archivos subidos:', err),
    });
  }

  toggleCategory(categoryName: string) {
    this.selectedCategories.update((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  }

  isCategorySelected(categoryName: string): boolean {
    return this.selectedCategories().has(categoryName);
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
          this.subirGaleriaUnaPorUna();
        },
        error: (err) => {
          console.error('Error al subir imagen:', err);
          alert('Error al subir la imagen.');
        },
      });
      return;
    }

    this.subirGaleriaUnaPorUna();
  }

  private subirGaleriaUnaPorUna(index = 0, uploadedPaths: string[] = []): void {
    const selectedGalleryUrls = this.galeryPaths().filter((path) => !path.startsWith('blob:'));

    if (!this.galeryToUpload || this.galeryToUpload.length === 0) {
      this.productForm.patchValue({ gallery: selectedGalleryUrls });
      this.subirVariantesImagenes();
      return;
    }

    if (index >= this.galeryToUpload.length) {
      this.productForm.patchValue({ gallery: [...selectedGalleryUrls, ...uploadedPaths] });
      this.subirVariantesImagenes();
      return;
    }

    const file = this.galeryToUpload[index];

    this.uploadService.subirArchivo(file).subscribe({
      next: (res: any) => {
        const imagePath = `${API_BASE_URL}/${res.fileDetails.path}`;
        this.subirGaleriaUnaPorUna(index + 1, [...uploadedPaths, imagePath]);
      },
      error: (err) => {
        console.error('Error al subir imagen de galería:', err);
        alert('Error al subir una imagen de la galería.');
      },
    });
  }

  private subirVariantesImagenes(variantIndex = 0, allVariantImages: Map<number, string[]> = new Map()): void {
    const variantIndices = Array.from(this.variantFilesToUpload.keys());

    if (variantIndices.length === 0) {
      this.enviarFormularioFinal(allVariantImages);
      return;
    }

    if (variantIndex >= variantIndices.length) {
      this.enviarFormularioFinal(allVariantImages);
      return;
    }

    const currentVariantIdx = variantIndices[variantIndex];
    const files = this.variantFilesToUpload.get(currentVariantIdx) || [];

    if (files.length === 0) {
      this.subirVariantesImagenes(variantIndex + 1, allVariantImages);
      return;
    }

    this.subirVariantImagenesRecursive(currentVariantIdx, 0, [], allVariantImages, variantIndex, variantIndices.length);
  }

  private subirVariantImagenesRecursive(
    variantIdx: number,
    fileIndex: number,
    uploadedPaths: string[],
    allVariantImages: Map<number, string[]>,
    variantProgressIndex: number,
    totalVariants: number,
  ): void {
    const files = this.variantFilesToUpload.get(variantIdx) || [];

    if (fileIndex >= files.length) {
      allVariantImages.set(variantIdx, uploadedPaths);
      this.subirVariantesImagenes(variantProgressIndex + 1, allVariantImages);
      return;
    }

    const file = files[fileIndex];

    this.uploadService.subirArchivo(file).subscribe({
      next: (res: any) => {
        const imagePath = `${API_BASE_URL}/${res.fileDetails.path}`;
        this.subirVariantImagenesRecursive(
          variantIdx,
          fileIndex + 1,
          [...uploadedPaths, imagePath],
          allVariantImages,
          variantProgressIndex,
          totalVariants,
        );
      },
      error: (err) => {
        console.error('Error al subir imagen de variante:', err);
        alert('Error al subir una imagen de la variante.');
      },
    });
  }

  private enviarFormularioFinal(variantImagesMap: Map<number, string[]> = new Map()): void {
    const rawValue = this.productForm.getRawValue();
    const categorias = Array.from(this.selectedCategories());
    const safeGallery = Array.isArray(rawValue.gallery)
      ? rawValue.gallery.filter((url: string) => typeof url === 'string' && !url.startsWith('blob:'))
      : [];

    const payload: any = {
      ...rawValue,
      gallery: safeGallery,
      stock_quantity: rawValue.manage_stock ? Number(rawValue.stock_quantity) || 0 : 0,
      variantes: this.buildVariantsPayload(rawValue.variantes ?? [], variantImagesMap),
      categoria: categorias,
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
      next: () => {
        this.variantFilesToUpload.clear();
        this.variantImagePreviews.set(new Map());
        this.router.navigate(['home']);
      },
      error: (err) => console.error('Error al guardar producto:', err),
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.fileToUpload = file;
      this.imagePath.set(URL.createObjectURL(file));
      this.closeImagePickerModal();
    }
  }

  onGalerySelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newFiles = Array.from(input.files);
      const currentFiles = this.galeryToUpload ?? [];
      this.galeryToUpload = [...currentFiles, ...newFiles];

      const previews = newFiles.map((file) => URL.createObjectURL(file));
      this.galeryPaths.update((current) => [...current, ...previews]);
      this.closeImagePickerModal();
    }
  }

  onVariantImagesSelected(event: Event, variantIndex: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newFiles = Array.from(input.files);
      const currentFiles = this.variantFilesToUpload.get(variantIndex) || [];
      this.variantFilesToUpload.set(variantIndex, [...currentFiles, ...newFiles]);

      const previews = newFiles.map((file) => URL.createObjectURL(file));
      this.variantImagePreviews.update((map) => {
        const newMap = new Map(map);
        const currentPreviews = newMap.get(variantIndex) || [];
        newMap.set(variantIndex, [...currentPreviews, ...previews]);
        return newMap;
      });

      const existingUrls = this.getVariantImagePreviews(variantIndex).filter((url) => !url.startsWith('blob:'));
      this.updateVariantFormImagesText(variantIndex, existingUrls);
      this.closeImagePickerModal();
    }
  }

  getVariantImagePreviews(variantIndex: number): string[] {
    return this.variantImagePreviews().get(variantIndex) || [];
  }

  getUploadedImageUrl(filename: string): string {
    return `${API_BASE_URL}/uploads/${encodeURIComponent(filename)}`;
  }

  openImagePickerModal(target: ImagePickerTarget, variantIndex: number | null = null): void {
    this.imagePickerTarget.set(target);
    this.activeVariantIndex.set(target === 'variant' ? variantIndex : null);
    this.showImagePickerModal.set(true);
  }

  closeImagePickerModal(): void {
    this.showImagePickerModal.set(false);
    this.activeVariantIndex.set(null);
  }

  getImagePickerTitle(): string {
    const target = this.imagePickerTarget();
    if (target === 'main') return 'Seleccionar imagen principal';
    if (target === 'gallery') return 'Seleccionar imágenes de la galería';
    return `Seleccionar imágenes de la variante #${(this.activeVariantIndex() ?? 0) + 1}`;
  }

  onModalImageClick(filename: string): void {
    const target = this.imagePickerTarget();
    if (target === 'main') {
      this.selectMainImageFromApi(filename);
      return;
    }

    if (target === 'gallery') {
      this.toggleGalleryImageFromApi(filename);
      return;
    }

    const variantIndex = this.activeVariantIndex();
    if (variantIndex === null) return;
    this.toggleVariantImageFromApi(variantIndex, filename);
  }

  selectMainImageFromApi(filename: string): void {
    const imageUrl = this.getUploadedImageUrl(filename);
    this.fileToUpload = null;
    this.imagePath.set(imageUrl);
    this.productForm.patchValue({ image: imageUrl });
    this.closeImagePickerModal();
  }

  isMainImageSelectedFromApi(filename: string): boolean {
    return this.imagePath() === this.getUploadedImageUrl(filename);
  }

  toggleGalleryImageFromApi(filename: string): void {
    const imageUrl = this.getUploadedImageUrl(filename);
    const next = new Set(this.galeryPaths());

    if (next.has(imageUrl)) {
      next.delete(imageUrl);
    } else {
      next.add(imageUrl);
    }

    const nextArray = Array.from(next);
    this.galeryToUpload = null;
    this.galeryPaths.set(nextArray);
    this.productForm.patchValue({ gallery: nextArray.filter((url) => !url.startsWith('blob:')) });
  }

  removeGalleryImageAt(index: number): void {
    const next = this.galeryPaths().filter((_, i) => i !== index);
    this.galeryPaths.set(next);
    this.productForm.patchValue({ gallery: next.filter((url) => !url.startsWith('blob:')) });
  }

  isGalleryImageSelectedFromApi(filename: string): boolean {
    const imageUrl = this.getUploadedImageUrl(filename);
    return this.galeryPaths().includes(imageUrl);
  }

  toggleVariantImageFromApi(variantIndex: number, filename: string): void {
    const imageUrl = this.getUploadedImageUrl(filename);

    this.variantImagePreviews.update((map) => {
      const next = new Map(map);
      const current = next.get(variantIndex) || [];
      const currentSet = new Set(current);

      if (currentSet.has(imageUrl)) {
        currentSet.delete(imageUrl);
      } else {
        currentSet.add(imageUrl);
      }

      const nextValues = Array.from(currentSet);
      next.set(variantIndex, nextValues);
      this.updateVariantFormImagesText(
        variantIndex,
        nextValues.filter((url) => !url.startsWith('blob:')),
      );
      return next;
    });
  }

  isVariantImageSelectedFromApi(variantIndex: number, filename: string): boolean {
    const imageUrl = this.getUploadedImageUrl(filename);
    return (this.variantImagePreviews().get(variantIndex) || []).includes(imageUrl);
  }

  removeVariantImageAt(variantIndex: number, imageIndex: number): void {
    const currentPreviews = this.getVariantImagePreviews(variantIndex);
    if (imageIndex < 0 || imageIndex >= currentPreviews.length) return;

    const updatedPreviews = currentPreviews.filter((_, idx) => idx !== imageIndex);

    this.variantImagePreviews.update((map) => {
      const next = new Map(map);
      if (updatedPreviews.length > 0) {
        next.set(variantIndex, updatedPreviews);
      } else {
        next.delete(variantIndex);
      }
      return next;
    });

    const files = this.variantFilesToUpload.get(variantIndex) || [];
    if (files.length > 0) {
      const updatedFiles = files.filter((_, idx) => idx !== imageIndex);
      if (updatedFiles.length > 0) {
        this.variantFilesToUpload.set(variantIndex, updatedFiles);
      } else {
        this.variantFilesToUpload.delete(variantIndex);
      }
    }

    this.updateVariantFormImagesText(variantIndex, updatedPreviews.filter((url) => !url.startsWith('blob:')));
  }

  isModalImageSelected(filename: string): boolean {
    const target = this.imagePickerTarget();
    if (target === 'main') {
      return this.isMainImageSelectedFromApi(filename);
    }

    if (target === 'gallery') {
      return this.isGalleryImageSelectedFromApi(filename);
    }

    const variantIndex = this.activeVariantIndex();
    if (variantIndex === null) return false;
    return this.isVariantImageSelectedFromApi(variantIndex, filename);
  }

  private updateVariantFormImagesText(variantIndex: number, urls: string[]): void {
    const variantGroup = this.variantesFormArray.at(variantIndex);
    if (!variantGroup) return;
    variantGroup.patchValue({ imagenes_text: urls.join(', ') });
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
    const existingImages = Array.isArray(variant?.imagenes) ? variant.imagenes : [];

    if (existingImages.length > 0) {
      this.variantImagePreviews.update((map) => {
        const newMap = new Map(map);
        newMap.set(variantIndex, existingImages);
        return newMap;
      });
    }

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

    this.variantImagePreviews.update((map) => {
      const newMap = new Map<number, string[]>();
      map.forEach((value, key) => {
        if (key < index) {
          newMap.set(key, value);
        } else if (key > index) {
          newMap.set(key - 1, value);
        }
      });
      return newMap;
    });

    const newVariantFilesToUpload = new Map<number, File[]>();
    this.variantFilesToUpload.forEach((value, key) => {
      if (key < index) {
        newVariantFilesToUpload.set(key, value);
      } else if (key > index) {
        newVariantFilesToUpload.set(key - 1, value);
      }
    });
    this.variantFilesToUpload = newVariantFilesToUpload;
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
    const { variantes, physical_attributes, gallery, categoria, ...productWithoutVariants } = product;
    this.productForm.patchValue({
      ...productWithoutVariants,
      gallery: Array.isArray(gallery) ? gallery : [],
      physical_attributes:
        physical_attributes ?? {
          length: 0,
          width: 0,
          height: 0,
          weight: 0,
        },
    });

    this.variantesFormArray.clear();
    this.variantImagePreviews.set(new Map());
    this.variantFilesToUpload.clear();
    if (Array.isArray(variantes)) {
      variantes.forEach((variant) => this.addVariant(variant));
    }
  }

  private buildVariantsPayload(rawVariants: any[], variantImagesMap: Map<number, string[]> = new Map()): Variant[] {
    if (!Array.isArray(rawVariants)) {
      return [];
    }

    return rawVariants.map((rawVariant, index) => {
      const uploadedImages = variantImagesMap.get(index) || [];
      const existingImages = this.parseImages(rawVariant.imagenes_text).filter((url) => !url.startsWith('blob:'));
      const imagenes = Array.from(new Set([...existingImages, ...uploadedImages]));

      const variantPayload: Variant = {
        ...this.buildDynamicAttributes(rawVariant.attributes ?? []),
        stock: Number(rawVariant.stock) || 0,
        precio_adicional: Number(rawVariant.precio_adicional) || 0,
        imagenes,
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
