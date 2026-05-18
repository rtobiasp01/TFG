import { Component, HostListener, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../../services/product-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../../interfaces/product';
import { UploadService } from '../../../services/upload-service';
import { CategoryService } from '../../../services/category-service';
import { Variant } from '../../../interfaces/variant';
import { Category } from '../../../interfaces/category';
import { CommonModule } from '@angular/common';
import { QuillModule } from 'ngx-quill';
import { firstValueFrom } from 'rxjs';
import { CustomImagePlacement, CustomizationConfig } from '../../../interfaces/customization';

const API_BASE_URL = 'http://localhost:3000';
const PREVIEW_OVERLAY_MAX_PERCENT = 92;
type ImagePickerTarget = 'main' | 'gallery' | 'variant';
interface CustomizationConfigFormValue {
  allowImage: boolean;
  enableBackgroundRemoval: boolean;
  allowText: boolean;
  maxImageSize: number;
  maxTextLength: number;
  imageFormats: string;
  textPlaceholder: string;
  imagePlacementXPercent: number;
  imagePlacementYPercent: number;
  imagePlacementWidthPercent: number;
  imagePlacementHeightPercent: number;
  textPlacementXPercent: number;
  textPlacementYPercent: number;
  textPlacementWidthPercent: number;
  textPlacementHeightPercent: number;
}

type PlacementTarget = 'image' | 'text';

type PlacementInteractionMode = 'drag' | 'resize';

interface PlacementInteractionState {
  target: PlacementTarget;
  mode: PlacementInteractionMode;
  startClientX: number;
  startClientY: number;
  startPlacement: CustomImagePlacement;
  canvasRect: DOMRect;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, QuillModule],
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
  readonly showCustomizationTab = signal<boolean>(false);
  readonly categories = signal<Category[]>([]);
  readonly selectedCategories = signal<Set<string>>(new Set());
  readonly variantImagePreviews = signal<Map<number, string[]>>(new Map());
  readonly uploadedFiles = signal<string[]>([]);
  readonly showImagePickerModal = signal<boolean>(false);
  readonly imagePickerTarget = signal<ImagePickerTarget>('main');
  readonly activeVariantIndex = signal<number | null>(null);
  readonly collapsedVariantIndexes = signal<Set<number>>(new Set());
  readonly saveError = signal<string>('');
  readonly manualCategoryName = signal<string>('');
  readonly categoryInputError = signal<string>('');
  readonly activePlacementTarget = signal<PlacementTarget>('image');
  readonly descriptionModules = {
    toolbar: '#product-description-toolbar',
  };
  readonly descriptionFormats = [
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'header',
    'blockquote',
    'link',
    'size',
  ];
  fileToUpload: File | null = null;
  galeryToUpload: File[] | null = null;
  variantFilesToUpload: Map<number, File[]> = new Map();
  private hasManualSlugEdition = false;
  private hasManualSkuEdition = false;
  private placementInteraction: PlacementInteractionState | null = null;

  readonly productForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    short_description: [''],
    type: ['simple', Validators.required],
    slug: [''],
    price: [0, [Validators.required, Validators.min(0.01)]],
    sku: ['', Validators.required],
    stock_quantity: [0, [Validators.min(0)]],
    manage_stock: [false],
    is_draft: [false],
    physical_attributes: this.fb.group({
      length: [0, [Validators.min(0)]],
      width: [0, [Validators.min(0)]],
      height: [0, [Validators.min(0)]],
      weight: [0, [Validators.min(0)]],
    }),
    customization_config: this.fb.group({
      allowImage: [true],
      enableBackgroundRemoval: [true],
      allowText: [true],
      maxImageSize: [5242880, [Validators.min(0)]],
      maxTextLength: [200, [Validators.min(0)]],
      imageFormats: ['jpg,jpeg,png,webp'],
      textPlaceholder: ['Escribe un mensaje personalizado'],
      imagePlacementXPercent: [50, [Validators.min(0), Validators.max(100)]],
      imagePlacementYPercent: [50, [Validators.min(0), Validators.max(100)]],
      imagePlacementWidthPercent: [56, [Validators.min(1), Validators.max(100)]],
      imagePlacementHeightPercent: [56, [Validators.min(1), Validators.max(100)]],
      textPlacementXPercent: [50, [Validators.min(0), Validators.max(100)]],
      textPlacementYPercent: [80, [Validators.min(0), Validators.max(100)]],
      textPlacementWidthPercent: [70, [Validators.min(1), Validators.max(100)]],
      textPlacementHeightPercent: [22, [Validators.min(1), Validators.max(100)]],
    }),
    variantes: this.fb.array([]),
    image: ['', Validators.required],
    gallery: [[] as string[]],
  });

  get variantesFormArray(): FormArray<FormGroup> {
    return this.productForm.get('variantes') as FormArray<FormGroup>;
  }

  variantesControls() {
    return this.variantesFormArray.controls;
  }

  constructor() {
    this.setupAutoGeneratedIdentifiers();
    this.loadCategories();
    this.loadUploadedFiles();

    if (this.id()) {
      this.productService.getByIdAdmin(this.id()).subscribe({
        next: (product: Product) => {
          this.imagePath.set(product.image || '');
          this.galeryPaths.set(Array.isArray(product.gallery) ? product.gallery : []);
          this.selectedCategories.set(new Set(product.categoria || []));
          this.patchProductInForm(product);
          this.syncIdentifierManualFlags();
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

  onManualCategoryInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.manualCategoryName.set(value);

    if (this.categoryInputError()) {
      this.categoryInputError.set('');
    }
  }

  addManualCategory(): void {
    const normalizedName = this.normalizeCategoryName(this.manualCategoryName());

    if (!normalizedName) {
      this.categoryInputError.set('Introduce un nombre de categoría válido.');
      return;
    }

    const existingCategory = this.findCategoryByName(normalizedName);
    const finalCategoryName = existingCategory?.name ?? normalizedName;

    if (!existingCategory) {
      this.categories.update((prev) => [
        ...prev,
        {
          _id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: normalizedName,
          description: '',
          visible: true,
        },
      ]);
    }

    this.selectedCategories.update((prev) => {
      const next = new Set(prev);
      next.add(finalCategoryName);
      return next;
    });

    this.manualCategoryName.set('');
    this.categoryInputError.set('');
  }

  async onSubmit(): Promise<void> {
    this.saveError.set('');
    this.categoryInputError.set('');

    if (this.productForm.invalid) {
      alert('Por favor rellena los campos obligatorios');
      return;
    }

    const categoriesReady = await this.ensureSelectedCategoriesExist();
    if (!categoriesReady) {
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

  private normalizeCategoryName(rawName: string): string {
    return String(rawName || '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private categoryNameKey(name: string): string {
    return this.normalizeCategoryName(name).toLocaleLowerCase();
  }

  private findCategoryByName(name: string): Category | undefined {
    const key = this.categoryNameKey(name);
    return this.categories().find((category) => this.categoryNameKey(category.name) === key);
  }

  private findPersistedCategoryByName(name: string): Category | undefined {
    const key = this.categoryNameKey(name);
    return this.categories().find((category) => {
      if (!category?._id || String(category._id).startsWith('draft-')) {
        return false;
      }

      return this.categoryNameKey(category.name) === key;
    });
  }

  private normalizeSelectedCategoryNames(): void {
    const normalizedSet = new Set<string>();

    this.selectedCategories().forEach((name) => {
      const normalized = this.normalizeCategoryName(name);
      if (!normalized) {
        return;
      }

      const existingCategory = this.findPersistedCategoryByName(normalized);
      normalizedSet.add(existingCategory?.name ?? normalized);
    });

    this.selectedCategories.set(normalizedSet);
  }

  private async ensureSelectedCategoriesExist(): Promise<boolean> {
    this.normalizeSelectedCategoryNames();

    const selected = Array.from(this.selectedCategories());
    const missingCategories = selected.filter((name) => !this.findPersistedCategoryByName(name));

    if (missingCategories.length === 0) {
      return true;
    }

    try {
      await Promise.all(
        missingCategories.map((name) =>
          firstValueFrom(
            this.categoryService.create({
              name,
              description: '',
              visible: true,
            }),
          ),
        ),
      );

      await this.refreshCategories();
      this.normalizeSelectedCategoryNames();
      return true;
    } catch (error) {
      console.error('Error al crear categorías automáticamente:', error);
      this.saveError.set(
        'No se pudieron crear las categorías nuevas automáticamente. Revisa los nombres e inténtalo de nuevo.',
      );
      return false;
    }
  }

  private async refreshCategories(): Promise<void> {
    try {
      const categories = await firstValueFrom(this.categoryService.getAll());
      this.categories.set(categories);
    } catch (error) {
      console.error('Error al recargar categorías:', error);
    }
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

  private subirVariantesImagenes(
    variantIndex = 0,
    allVariantImages: Map<number, string[]> = new Map(),
  ): void {
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

    this.subirVariantImagenesRecursive(
      currentVariantIdx,
      0,
      [],
      allVariantImages,
      variantIndex,
      variantIndices.length,
    );
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
    const titleForAutoIds = String(rawValue.title ?? '');
    const normalizedSlug = String(rawValue.slug ?? '').trim();
    const normalizedSku = String(rawValue.sku ?? '').trim();
    const resolvedSlug =
      normalizedSlug.length > 0 ? normalizedSlug : this.generateSlugFromTitle(titleForAutoIds);
    const resolvedSku =
      normalizedSku.length > 0 ? normalizedSku : this.generateSkuFromTitle(titleForAutoIds);
    const categorias = Array.from(this.selectedCategories());
    const sanitizedDescription = this.sanitizeRichText(rawValue.description || '');
    const safeGallery = Array.isArray(rawValue.gallery)
      ? rawValue.gallery.filter(
          (url: string) => typeof url === 'string' && !url.startsWith('blob:'),
        )
      : [];

    const payload: any = {
      ...rawValue,
      slug: resolvedSlug,
      sku: resolvedSku,
      description: sanitizedDescription,
      gallery: safeGallery,
      stock_quantity: rawValue.manage_stock ? Number(rawValue.stock_quantity) || 0 : 0,
      variantes: this.buildVariantsPayload(rawValue.variantes ?? [], variantImagesMap),
      categoria: categorias,
      is_draft: rawValue.is_draft ?? false,
    };

    payload.customization_config =
      rawValue.type === 'custom-personalized'
        ? this.normalizeCustomizationConfigPayload(rawValue.customization_config)
        : null;

    if (rawValue.type === 'virtual') {
      payload.physical_attributes = null;
    }

    if (rawValue.type !== 'variable' && rawValue.type !== 'custom-personalized') {
      payload.variantes = [];
    }

    const operation$ = this.id()
      ? this.productService.update(this.id(), payload)
      : this.productService.create(payload);

    operation$.subscribe({
      next: () => {
        this.variantFilesToUpload.clear();
        this.variantImagePreviews.set(new Map());
        if (this.id()) {
          window.location.reload();
        } else {
          this.router.navigate(['admin/home']);
        }
      },
      error: (err) => {
        console.error('Error al guardar producto:', err);
        this.handleSaveError(err);
      },
    });
  }

  private handleSaveError(err: any): void {
    const backendMessage = typeof err?.error?.message === 'string' ? err.error.message.trim() : '';

    if (err?.status === 409 && backendMessage.length > 0) {
      this.saveError.set(backendMessage);
      return;
    }

    this.saveError.set('No se pudo guardar el producto. Revisa los datos e inténtalo de nuevo.');
  }

  private setupAutoGeneratedIdentifiers(): void {
    const titleControl = this.productForm.get('title');

    titleControl?.valueChanges.subscribe((rawTitle) => {
      const title = String(rawTitle ?? '');

      if (!this.hasManualSlugEdition) {
        this.productForm.patchValue(
          { slug: this.generateSlugFromTitle(title) },
          { emitEvent: false },
        );
      }

      if (!this.hasManualSkuEdition) {
        this.productForm.patchValue(
          { sku: this.generateSkuFromTitle(title) },
          { emitEvent: false },
        );
      }
    });
  }

  private syncIdentifierManualFlags(): void {
    const title = String(this.productForm.get('title')?.value ?? '');
    const currentSlug = String(this.productForm.get('slug')?.value ?? '').trim();
    const currentSku = String(this.productForm.get('sku')?.value ?? '').trim();
    const autoSlug = this.generateSlugFromTitle(title);
    const autoSku = this.generateSkuFromTitle(title);

    this.hasManualSlugEdition = currentSlug.length > 0 && currentSlug !== autoSlug;
    this.hasManualSkuEdition = currentSku.length > 0 && currentSku !== autoSku;
  }

  onSlugInputChange(): void {
    const currentSlug = String(this.productForm.get('slug')?.value ?? '').trim();
    this.hasManualSlugEdition = currentSlug.length > 0;

    if (!this.hasManualSlugEdition) {
      const title = String(this.productForm.get('title')?.value ?? '');
      this.productForm.patchValue(
        { slug: this.generateSlugFromTitle(title) },
        { emitEvent: false },
      );
    }
  }

  onSkuInputChange(): void {
    const currentSku = String(this.productForm.get('sku')?.value ?? '').trim();
    this.hasManualSkuEdition = currentSku.length > 0;

    if (!this.hasManualSkuEdition) {
      const title = String(this.productForm.get('title')?.value ?? '');
      this.productForm.patchValue({ sku: this.generateSkuFromTitle(title) }, { emitEvent: false });
    }
  }

  private generateSlugFromTitle(title: string): string {
    return title
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private generateSkuFromTitle(title: string): string {
    return title
      .toString()
      .toUpperCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 64);
  }

  private sanitizeRichText(rawHtml: string): string {
    if (!rawHtml || typeof rawHtml !== 'string') {
      return '';
    }

    if (typeof document === 'undefined') {
      return rawHtml;
    }

    const container = document.createElement('div');
    container.innerHTML = rawHtml;

    container.querySelectorAll('*').forEach((node) => {
      node.removeAttribute('style');

      const classAttr = node.getAttribute('class');
      if (!classAttr) {
        return;
      }

      const safeClasses = classAttr
        .split(/\s+/)
        .filter(
          (className) =>
            className === 'ql-size-small' ||
            className === 'ql-size-large' ||
            className === 'ql-size-huge',
        );

      if (safeClasses.length > 0) {
        node.setAttribute('class', safeClasses.join(' '));
      } else {
        node.removeAttribute('class');
      }
    });

    container.querySelectorAll('span').forEach((span) => {
      const parent = span.parentNode;
      if (!parent) return;
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
    });

    container.querySelectorAll('p').forEach((p) => {
      const text = (p.textContent || '').replace(/\u00A0/g, ' ').trim();
      const hasMedia = p.querySelector('img, video, iframe, br');
      if (!text && !hasMedia) {
        p.remove();
      }
    });

    return container.innerHTML.replace(/&nbsp;/g, ' ').trim();
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

      const existingUrls = this.getVariantImagePreviews(variantIndex).filter(
        (url) => !url.startsWith('blob:'),
      );
      this.updateVariantFormImagesText(variantIndex, existingUrls);
      this.closeImagePickerModal();
    }
  }

  getVariantImagePreviews(variantIndex: number): string[] {
    return this.variantImagePreviews().get(variantIndex) || [];
  }

  isVideoFile(url: string): boolean {
    const ext = url.split('.').pop()?.toLowerCase();
    return ext === 'mp4' || ext === 'webm' || ext === 'ogg' || ext === 'mov' || ext === 'avi';
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
    if (target === 'main') return 'Elegir imagen principal de la biblioteca';
    if (target === 'gallery') return 'Elegir imágenes de la biblioteca';
    return `Elegir imágenes de la variante #${(this.activeVariantIndex() ?? 0) + 1}`;
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

    this.updateVariantFormImagesText(
      variantIndex,
      updatedPreviews.filter((url) => !url.startsWith('blob:')),
    );
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
    this.showLogisticsTab.set(type !== 'virtual');
    this.showVariantsTab.set(type === 'variable' || type === 'custom-personalized');
    this.showCustomizationTab.set(type === 'custom-personalized');

    if (type === 'variable' && this.variantesFormArray.length === 0) {
      this.addVariant(undefined, { insertAtTop: true, collapsed: true });
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

  addVariant(
    variant?: Variant,
    options: { insertAtTop?: boolean; collapsed?: boolean } = {},
  ): void {
    const { insertAtTop = false, collapsed = true } = options;
    const variantStock = variant?.stock_quantity ?? Number((variant as any)?.stock ?? 0);
    const variantGroup = this.fb.group({
      stock_quantity: [variantStock, [Validators.min(0)]],
      precio_adicional: [variant?.precio_adicional ?? 0, [Validators.min(0)]],
      imagenes_text: [Array.isArray(variant?.imagenes) ? variant.imagenes.join(', ') : ''],
      attributes: this.fb.array([]),
      has_custom_physical_attributes: [Boolean(variant?.physical_attributes)],
      physical_attributes: this.fb.group({
        length: [
          this.getPhysicalAttributeValue(variant?.physical_attributes, 'length', 0),
          [Validators.min(0)],
        ],
        width: [
          this.getPhysicalAttributeValue(variant?.physical_attributes, 'width', 0),
          [Validators.min(0)],
        ],
        height: [
          this.getPhysicalAttributeValue(variant?.physical_attributes, 'height', 0),
          [Validators.min(0)],
        ],
        weight: [
          this.getPhysicalAttributeValue(variant?.physical_attributes, 'weight', 0),
          [Validators.min(0)],
        ],
      }),
    });

    if (insertAtTop) {
      this.shiftVariantIndexedStateForInsertAtTop();
      this.variantesFormArray.insert(0, variantGroup);
    } else {
      this.variantesFormArray.push(variantGroup);
    }

    const variantIndex = insertAtTop ? 0 : this.variantesFormArray.length - 1;
    this.collapsedVariantIndexes.update((set) => {
      const next = new Set(set);
      if (collapsed) {
        next.add(variantIndex);
      } else {
        next.delete(variantIndex);
      }
      return next;
    });
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

    dynamicAttributes.forEach(({ key, values }) => {
      this.addVariantAttribute(variantIndex, key, values as string[]);
    });
  }

  removeVariant(index: number): void {
    this.variantesFormArray.removeAt(index);

    this.collapsedVariantIndexes.update((set) => {
      const next = new Set<number>();
      set.forEach((key) => {
        if (key < index) {
          next.add(key);
        } else if (key > index) {
          next.add(key - 1);
        }
      });
      return next;
    });

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

  duplicateVariant(index: number): void {
    const sourceGroup = this.variantesFormArray.at(index);
    if (!sourceGroup) {
      return;
    }

    const rawVariant = sourceGroup.getRawValue();
    const dynamicAttributes = this.buildDynamicAttributes(rawVariant.attributes ?? []);
    const existingImages = [...(this.variantImagePreviews().get(index) || [])];

    const duplicateVariant: Variant = {
      ...dynamicAttributes,
      stock_quantity: Number(rawVariant.stock_quantity) || 0,
      precio_adicional: Number(rawVariant.precio_adicional) || 0,
      imagenes: existingImages,
    };

    if (rawVariant.has_custom_physical_attributes) {
      duplicateVariant.physical_attributes = {
        length: Number(rawVariant.physical_attributes?.length) || 0,
        width: Number(rawVariant.physical_attributes?.width) || 0,
        height: Number(rawVariant.physical_attributes?.height) || 0,
        weight: Number(rawVariant.physical_attributes?.weight) || 0,
      };
    }

    const filesToUpload = this.variantFilesToUpload.get(index) || [];
    this.addVariant(duplicateVariant, { insertAtTop: true, collapsed: true });

    const newIndex = 0;

    if (existingImages.length > 0) {
      this.variantImagePreviews.update((map) => {
        const next = new Map(map);
        next.set(newIndex, [...existingImages]);
        return next;
      });
      this.updateVariantFormImagesText(
        newIndex,
        existingImages.filter((url) => !url.startsWith('blob:')),
      );
    }

    if (filesToUpload.length > 0) {
      this.variantFilesToUpload.set(newIndex, [...filesToUpload]);
    }
  }

  toggleVariantCollapse(index: number): void {
    this.collapsedVariantIndexes.update((set) => {
      const next = new Set(set);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  isVariantCollapsed(index: number): boolean {
    return this.collapsedVariantIndexes().has(index);
  }

  getVariantDisplayName(index: number): string {
    const variantGroup = this.variantesFormArray.at(index);
    if (!variantGroup) {
      return `Variante ${index + 1}`;
    }

    const rawVariant = variantGroup.getRawValue();
    const dynamicAttributes = this.buildDynamicAttributes(rawVariant.attributes ?? []);
    const entries = Object.entries(dynamicAttributes);

    if (entries.length === 0) {
      return `Variante ${index + 1}`;
    }

    const preferredKeys = ['color', 'talla', 'size'];
    const parts: string[] = [];

    preferredKeys.forEach((key) => {
      const value = dynamicAttributes[key as keyof typeof dynamicAttributes];
      if (value !== undefined) {
        parts.push(`${this.normalizeAttributeLabel(key)}: ${this.formatAttributeValue(value)}`);
      }
    });

    if (parts.length === 0) {
      entries.slice(0, 2).forEach(([key, value]) => {
        parts.push(`${this.normalizeAttributeLabel(key)}: ${this.formatAttributeValue(value)}`);
      });
    }

    return parts.join(' · ');
  }

  variantAttributesControls(variantIndex: number) {
    return this.getVariantAttributesFormArray(variantIndex).controls;
  }

  addVariantAttribute(variantIndex: number, key = '', values: string[] = []): void {
    const valuesFormArray = this.fb.array(
      values.map((val) => this.fb.control(val || '', Validators.required)),
    );

    if (valuesFormArray.length === 0) {
      valuesFormArray.push(this.fb.control('', Validators.required));
    }

    this.getVariantAttributesFormArray(variantIndex).push(
      this.fb.group({
        key: [key, Validators.required],
        values: valuesFormArray,
      }),
    );
  }

  removeVariantAttribute(variantIndex: number, attributeIndex: number): void {
    this.getVariantAttributesFormArray(variantIndex).removeAt(attributeIndex);
  }

  getAttributeValuesControls(variantIndex: number, attributeIndex: number) {
    const attribute = this.getVariantAttributesFormArray(variantIndex).at(attributeIndex);
    if (!attribute) return [];
    const valuesArray = attribute.get('values') as FormArray;
    return valuesArray?.controls || [];
  }

  addValueToAttribute(variantIndex: number, attributeIndex: number): void {
    const attribute = this.getVariantAttributesFormArray(variantIndex).at(attributeIndex);
    if (!attribute) return;
    const valuesArray = attribute.get('values') as FormArray;
    if (valuesArray) {
      valuesArray.push(this.fb.control('', Validators.required));
    }
  }

  removeValueFromAttribute(variantIndex: number, attributeIndex: number, valueIndex: number): void {
    const attribute = this.getVariantAttributesFormArray(variantIndex).at(attributeIndex);
    if (!attribute) return;
    const valuesArray = attribute.get('values') as FormArray;
    if (valuesArray && valuesArray.length > 1) {
      valuesArray.removeAt(valueIndex);
    }
  }
  private patchProductInForm(product: Product): void {
    const {
      variantes,
      physical_attributes,
      gallery,
      categoria,
      customization_config,
      user_customization,
      ...productWithoutVariants
    } = product;
    this.productForm.patchValue({
      ...productWithoutVariants,
      gallery: Array.isArray(gallery) ? gallery : [],
      physical_attributes: physical_attributes ?? {
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
      },
      customization_config: this.normalizeCustomizationConfigFormValue(customization_config),
    });

    this.variantesFormArray.clear();
    this.variantImagePreviews.set(new Map());
    this.variantFilesToUpload.clear();
    if (Array.isArray(variantes)) {
      variantes.forEach((variant) =>
        this.addVariant(variant, { insertAtTop: false, collapsed: true }),
      );
    }

    this.collapsedVariantIndexes.set(
      new Set(Array.from({ length: this.variantesFormArray.length }, (_, i) => i)),
    );
  }

  private shiftVariantIndexedStateForInsertAtTop(): void {
    this.collapsedVariantIndexes.update((set) => {
      const next = new Set<number>();
      set.forEach((key) => next.add(key + 1));
      return next;
    });

    this.variantImagePreviews.update((map) => {
      const next = new Map<number, string[]>();
      map.forEach((value, key) => next.set(key + 1, value));
      return next;
    });

    const shiftedFiles = new Map<number, File[]>();
    this.variantFilesToUpload.forEach((value, key) => {
      shiftedFiles.set(key + 1, value);
    });
    this.variantFilesToUpload = shiftedFiles;
  }

  private buildVariantsPayload(
    rawVariants: any[],
    variantImagesMap: Map<number, string[]> = new Map(),
  ): Variant[] {
    if (!Array.isArray(rawVariants)) {
      return [];
    }

    return rawVariants.flatMap((rawVariant, index) => {
      const uploadedImages = variantImagesMap.get(index) || [];
      const existingImages = this.parseImages(rawVariant.imagenes_text).filter(
        (url) => !url.startsWith('blob:'),
      );
      const imagenes = Array.from(new Set([...existingImages, ...uploadedImages]));

      const dynamicAttributes = this.buildDynamicAttributes(rawVariant.attributes ?? []);
      const expandedAttributes = this.expandAttributeCombinations(dynamicAttributes);
      const normalizedStock = Number(rawVariant.stock_quantity) || 0;
      const normalizedAdditionalPrice = Number(rawVariant.precio_adicional) || 0;

      return expandedAttributes.map((attributeSet) => {
        const variantPayload: Variant = {
          ...attributeSet,
          stock_quantity: normalizedStock,
          precio_adicional: normalizedAdditionalPrice,
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
    });
  }

  private normalizeCustomizationConfigFormValue(
    customizationConfig?: CustomizationConfig | null,
  ): CustomizationConfigFormValue {
    const defaultConfig = this.getDefaultCustomizationConfigFormValue();

    if (!customizationConfig || typeof customizationConfig !== 'object') {
      return defaultConfig;
    }

    const imageFormats = Array.isArray(customizationConfig.imageFormats)
      ? customizationConfig.imageFormats.join(', ')
      : defaultConfig.imageFormats;

    const placement = this.normalizeImagePlacementForForm(
      customizationConfig.imagePlacement,
      this.getDefaultImagePlacement(),
    );
    const textPlacement = this.normalizeImagePlacementForForm(
      customizationConfig.textPlacement ?? customizationConfig.imagePlacement,
      this.getDefaultTextPlacement(),
    );

    return {
      allowImage: customizationConfig.allowImage ?? defaultConfig.allowImage,
      enableBackgroundRemoval:
        customizationConfig.enableBackgroundRemoval ?? defaultConfig.enableBackgroundRemoval,
      allowText: customizationConfig.allowText ?? defaultConfig.allowText,
      maxImageSize: customizationConfig.maxImageSize ?? defaultConfig.maxImageSize,
      maxTextLength: customizationConfig.maxTextLength ?? defaultConfig.maxTextLength,
      imageFormats,
      textPlaceholder: customizationConfig.textPlaceholder ?? defaultConfig.textPlaceholder,
      imagePlacementXPercent: placement.xPercent,
      imagePlacementYPercent: placement.yPercent,
      imagePlacementWidthPercent: placement.widthPercent,
      imagePlacementHeightPercent: placement.heightPercent,
      textPlacementXPercent: textPlacement.xPercent,
      textPlacementYPercent: textPlacement.yPercent,
      textPlacementWidthPercent: textPlacement.widthPercent,
      textPlacementHeightPercent: textPlacement.heightPercent,
    };
  }

  private normalizeCustomizationConfigPayload(
    customizationConfig:
      | {
          [K in keyof CustomizationConfigFormValue]?: CustomizationConfigFormValue[K] | null;
        }
      | null
      | undefined,
  ): CustomizationConfig {
    const defaultConfig = this.getDefaultCustomizationConfigFormValue();
    const rawImageFormats = customizationConfig?.imageFormats ?? defaultConfig.imageFormats;
    const enableBackgroundRemoval =
      customizationConfig?.enableBackgroundRemoval ?? defaultConfig.enableBackgroundRemoval;
    const imageFormats = String(rawImageFormats)
      .split(',')
      .map((format) => format.trim().toLowerCase())
      .filter((format) => format.length > 0);
    const textPlaceholder = customizationConfig?.textPlaceholder ?? defaultConfig.textPlaceholder;
    const imagePlacement = this.normalizeImagePlacementForForm(
      {
        xPercent: customizationConfig?.imagePlacementXPercent,
        yPercent: customizationConfig?.imagePlacementYPercent,
        widthPercent: customizationConfig?.imagePlacementWidthPercent,
        heightPercent: customizationConfig?.imagePlacementHeightPercent,
      },
      this.getDefaultImagePlacement(),
    );
    const textPlacement = this.normalizeImagePlacementForForm(
      {
        xPercent: customizationConfig?.textPlacementXPercent,
        yPercent: customizationConfig?.textPlacementYPercent,
        widthPercent: customizationConfig?.textPlacementWidthPercent,
        heightPercent: customizationConfig?.textPlacementHeightPercent,
      },
      this.getDefaultTextPlacement(),
    );

    return {
      allowImage: customizationConfig?.allowImage ?? defaultConfig.allowImage,
      enableBackgroundRemoval,
      allowText: customizationConfig?.allowText ?? defaultConfig.allowText,
      maxImageSize: customizationConfig?.maxImageSize ?? defaultConfig.maxImageSize,
      maxTextLength: customizationConfig?.maxTextLength ?? defaultConfig.maxTextLength,
      imageFormats: enableBackgroundRemoval
        ? imageFormats.length > 0
          ? imageFormats
          : ['jpg', 'jpeg', 'png', 'webp']
        : ['png'],
      textPlaceholder: String(textPlaceholder).trim(),
      imagePlacement,
      textPlacement,
    };
  }

  private getDefaultCustomizationConfigFormValue(): CustomizationConfigFormValue {
    return {
      allowImage: true,
      enableBackgroundRemoval: true,
      allowText: true,
      maxImageSize: 5242880,
      maxTextLength: 200,
      imageFormats: 'jpg,jpeg,png,webp',
      textPlaceholder: 'Escribe un mensaje personalizado',
      imagePlacementXPercent: 50,
      imagePlacementYPercent: 50,
      imagePlacementWidthPercent: 56,
      imagePlacementHeightPercent: 56,
      textPlacementXPercent: 50,
      textPlacementYPercent: 80,
      textPlacementWidthPercent: 70,
      textPlacementHeightPercent: 22,
    };
  }

  private getDefaultImagePlacement(): CustomImagePlacement {
    return {
      xPercent: 50,
      yPercent: 50,
      widthPercent: 56,
      heightPercent: 56,
    };
  }

  private getDefaultTextPlacement(): CustomImagePlacement {
    return {
      xPercent: 50,
      yPercent: 80,
      widthPercent: 70,
      heightPercent: 22,
    };
  }

  private normalizeImagePlacementForForm(
    rawPlacement:
      | {
          xPercent?: number | null;
          yPercent?: number | null;
          widthPercent?: number | null;
          heightPercent?: number | null;
        }
      | null
      | undefined,
    fallback: CustomImagePlacement,
  ): CustomImagePlacement {
    const clamp = (value: unknown, min: number, max: number, fallbackValue: number): number => {
      const parsed = Number(value);

      if (!Number.isFinite(parsed)) {
        return fallbackValue;
      }

      return Math.min(max, Math.max(min, parsed));
    };

    return {
      xPercent: clamp(rawPlacement?.xPercent, 0, 100, fallback.xPercent),
      yPercent: clamp(rawPlacement?.yPercent, 0, 100, fallback.yPercent),
      widthPercent: clamp(
        rawPlacement?.widthPercent,
        1,
        PREVIEW_OVERLAY_MAX_PERCENT,
        fallback.widthPercent,
      ),
      heightPercent: clamp(
        rawPlacement?.heightPercent,
        1,
        PREVIEW_OVERLAY_MAX_PERCENT,
        fallback.heightPercent,
      ),
    };
  }

  onEnableBackgroundRemovalChange(): void {
    const customizationConfigGroup = this.productForm.get(
      'customization_config',
    ) as FormGroup | null;
    const isEnabled = customizationConfigGroup?.get('enableBackgroundRemoval')?.value !== false;

    if (!customizationConfigGroup) {
      return;
    }

    if (!isEnabled) {
      customizationConfigGroup.patchValue({ imageFormats: 'png' });
    }
  }

  customizationPreviewImageUrl(): string {
    const mainImage = this.imagePath().trim();

    if (mainImage.length > 0) {
      return mainImage;
    }

    return '/images/customization-placeholder.svg';
  }

  customizationPlacementStyles(): Record<string, string> {
    const placement = this.getPlacementFromForm(this.activePlacementTarget());

    return {
      left: `${placement.xPercent}%`,
      top: `${placement.yPercent}%`,
      width: `${placement.widthPercent}%`,
      height: `${placement.heightPercent}%`,
    };
  }

  imagePlacementStyles(): Record<string, string> {
    const placement = this.getPlacementFromForm('image');

    return {
      left: `${placement.xPercent}%`,
      top: `${placement.yPercent}%`,
      width: `${placement.widthPercent}%`,
      height: `${placement.heightPercent}%`,
    };
  }

  textPlacementStyles(): Record<string, string> {
    const placement = this.getPlacementFromForm('text');

    return {
      left: `${placement.xPercent}%`,
      top: `${placement.yPercent}%`,
      width: `${placement.widthPercent}%`,
      height: `${placement.heightPercent}%`,
    };
  }

  setPlacementTarget(target: PlacementTarget): void {
    this.activePlacementTarget.set(target);
  }

  startPlacementDrag(
    event: PointerEvent,
    canvasElement: HTMLElement,
    target: PlacementTarget,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    this.placementInteraction = {
      target,
      mode: 'drag',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPlacement: this.getPlacementFromForm(target),
      canvasRect: canvasElement.getBoundingClientRect(),
    };
    this.activePlacementTarget.set(target);
  }

  startPlacementResize(
    event: PointerEvent,
    canvasElement: HTMLElement,
    target: PlacementTarget,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    this.placementInteraction = {
      target,
      mode: 'resize',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPlacement: this.getPlacementFromForm(target),
      canvasRect: canvasElement.getBoundingClientRect(),
    };
    this.activePlacementTarget.set(target);
  }

  @HostListener('window:pointermove', ['$event'])
  onWindowPointerMove(event: PointerEvent): void {
    if (!this.placementInteraction) {
      return;
    }

    event.preventDefault();
    const interaction = this.placementInteraction;
    const widthPx = interaction.canvasRect.width;
    const heightPx = interaction.canvasRect.height;

    if (widthPx <= 0 || heightPx <= 0) {
      return;
    }

    const deltaXPercent = ((event.clientX - interaction.startClientX) / widthPx) * 100;
    const deltaYPercent = ((event.clientY - interaction.startClientY) / heightPx) * 100;

    if (interaction.mode === 'drag') {
      const movedPlacement = {
        ...interaction.startPlacement,
        xPercent: interaction.startPlacement.xPercent + deltaXPercent,
        yPercent: interaction.startPlacement.yPercent + deltaYPercent,
      };

      this.patchPlacementToForm(interaction.target, this.clampPlacement(movedPlacement));
      return;
    }

    const initialLeft =
      interaction.startPlacement.xPercent - interaction.startPlacement.widthPercent / 2;
    const initialTop =
      interaction.startPlacement.yPercent - interaction.startPlacement.heightPercent / 2;

    const nextWidth = Math.max(5, interaction.startPlacement.widthPercent + deltaXPercent);
    const nextHeight = Math.max(5, interaction.startPlacement.heightPercent + deltaYPercent);
    const maxWidthFromLeft = 100 - initialLeft;
    const maxHeightFromTop = 100 - initialTop;
    const constrainedWidth = Math.min(nextWidth, maxWidthFromLeft, PREVIEW_OVERLAY_MAX_PERCENT);
    const constrainedHeight = Math.min(nextHeight, maxHeightFromTop, PREVIEW_OVERLAY_MAX_PERCENT);

    const resizedPlacement = {
      xPercent: initialLeft + constrainedWidth / 2,
      yPercent: initialTop + constrainedHeight / 2,
      widthPercent: constrainedWidth,
      heightPercent: constrainedHeight,
    };

    this.patchPlacementToForm(interaction.target, this.clampPlacement(resizedPlacement));
  }

  @HostListener('window:pointerup')
  onWindowPointerUp(): void {
    this.placementInteraction = null;
  }

  private getPlacementFromForm(target: PlacementTarget): CustomImagePlacement {
    const rawConfig = this.productForm.get('customization_config')?.value as
      | Partial<CustomizationConfigFormValue>
      | null
      | undefined;

    if (target === 'text') {
      return this.normalizeImagePlacementForForm(
        {
          xPercent: rawConfig?.textPlacementXPercent,
          yPercent: rawConfig?.textPlacementYPercent,
          widthPercent: rawConfig?.textPlacementWidthPercent,
          heightPercent: rawConfig?.textPlacementHeightPercent,
        },
        this.getDefaultTextPlacement(),
      );
    }

    return this.normalizeImagePlacementForForm(
      {
        xPercent: rawConfig?.imagePlacementXPercent,
        yPercent: rawConfig?.imagePlacementYPercent,
        widthPercent: rawConfig?.imagePlacementWidthPercent,
        heightPercent: rawConfig?.imagePlacementHeightPercent,
      },
      this.getDefaultImagePlacement(),
    );
  }

  private patchPlacementToForm(target: PlacementTarget, placement: CustomImagePlacement): void {
    const customizationConfigGroup = this.productForm.get(
      'customization_config',
    ) as FormGroup | null;

    if (!customizationConfigGroup) {
      return;
    }

    if (target === 'text') {
      customizationConfigGroup.patchValue({
        textPlacementXPercent: Number(placement.xPercent.toFixed(2)),
        textPlacementYPercent: Number(placement.yPercent.toFixed(2)),
        textPlacementWidthPercent: Number(placement.widthPercent.toFixed(2)),
        textPlacementHeightPercent: Number(placement.heightPercent.toFixed(2)),
      });
      return;
    }

    customizationConfigGroup.patchValue({
      imagePlacementXPercent: Number(placement.xPercent.toFixed(2)),
      imagePlacementYPercent: Number(placement.yPercent.toFixed(2)),
      imagePlacementWidthPercent: Number(placement.widthPercent.toFixed(2)),
      imagePlacementHeightPercent: Number(placement.heightPercent.toFixed(2)),
    });
  }

  private clampPlacement(placement: CustomImagePlacement): CustomImagePlacement {
    const width = Math.min(
      PREVIEW_OVERLAY_MAX_PERCENT,
      Math.max(5, Number(placement.widthPercent) || 5),
    );
    const height = Math.min(
      PREVIEW_OVERLAY_MAX_PERCENT,
      Math.max(5, Number(placement.heightPercent) || 5),
    );
    const minX = width / 2;
    const maxX = 100 - width / 2;
    const minY = height / 2;
    const maxY = 100 - height / 2;
    const x = Math.min(maxX, Math.max(minX, Number(placement.xPercent) || 50));
    const y = Math.min(maxY, Math.max(minY, Number(placement.yPercent) || 50));

    return {
      xPercent: x,
      yPercent: y,
      widthPercent: width,
      heightPercent: height,
    };
  }

  private getVariantAttributesFormArray(variantIndex: number): FormArray<FormGroup> {
    return this.variantesFormArray.at(variantIndex).get('attributes') as FormArray<FormGroup>;
  }

  private extractDynamicAttributes(
    variant?: Variant,
  ): Array<{ key: string; values: (string | number)[] }> {
    if (!variant) {
      return [];
    }

    const reservedKeys = new Set([
      'sku',
      'stock_quantity',
      'stock',
      'precio_adicional',
      'imagenes',
      'physical_attributes',
      'attributes',
      '_id',
    ]);

    const dynamicAttributes: Array<{ key: string; values: (string | number)[] }> = [];
    const seenKeys = new Set<string>();

    Object.entries(variant).forEach(([key, value]) => {
      if (reservedKeys.has(key) || value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        const cleanValues = value
          .map((v) => String(v).trim())
          .filter((v) => v.length > 0)
          .map((v) => this.parseDynamicAttributeValue(v));
        if (cleanValues.length > 0) {
          dynamicAttributes.push({ key, values: cleanValues });
        }
        seenKeys.add(key);
      } else {
        const cleanValue = String(value).trim();
        if (cleanValue.length > 0) {
          dynamicAttributes.push({ key, values: [this.parseDynamicAttributeValue(cleanValue)] });
        }
        seenKeys.add(key);
      }
    });

    if (
      variant.attributes &&
      typeof variant.attributes === 'object' &&
      !Array.isArray(variant.attributes)
    ) {
      Object.entries(variant.attributes).forEach(([key, value]) => {
        if (key && value !== null && value !== undefined && !seenKeys.has(key)) {
          if (Array.isArray(value)) {
            const cleanValues = value
              .map((v) => String(v).trim())
              .filter((v) => v.length > 0)
              .map((v) => this.parseDynamicAttributeValue(v));
            if (cleanValues.length > 0) {
              dynamicAttributes.push({ key, values: cleanValues });
            }
            seenKeys.add(key);
          } else {
            const cleanValue = String(value).trim();
            if (cleanValue.length > 0) {
              dynamicAttributes.push({
                key,
                values: [this.parseDynamicAttributeValue(cleanValue)],
              });
            }
            seenKeys.add(key);
          }
        }
      });
    }

    return dynamicAttributes;
  }

  private buildDynamicAttributes(
    rawAttributes: any[],
  ): Record<string, string | number | (string | number)[]> {
    if (!Array.isArray(rawAttributes)) {
      return {};
    }

    return rawAttributes.reduce(
      (acc, attribute) => {
        const rawKey = String(attribute?.key ?? '').trim();
        const rawValues = attribute?.values;

        if (!rawKey) {
          return acc;
        }

        let valueArray: (string | number)[] = [];

        if (Array.isArray(rawValues)) {
          valueArray = rawValues
            .map((val) => {
              const value = val?.value !== undefined ? val.value : val;
              return String(value).trim();
            })
            .filter((val) => val.length > 0)
            .map((val) => this.parseDynamicAttributeValue(val));
        }

        if (valueArray.length === 0) {
          return acc;
        }

        acc[rawKey] = valueArray.length === 1 ? valueArray[0] : valueArray;
        return acc;
      },
      {} as Record<string, string | number | (string | number)[]>,
    );
  }

  private parseDynamicAttributeValue(value: string): string | number {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && value !== '' ? parsedValue : value;
  }

  private normalizeAttributeLabel(rawLabel: string): string {
    return rawLabel.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private formatAttributeValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((item) => String(item)).join('/');
    }

    return String(value ?? '');
  }

  private parseImages(rawImages: string): string[] {
    return rawImages
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private expandAttributeCombinations(
    attributes: Record<string, string | number | (string | number)[]>,
  ): Array<Record<string, string | number>> {
    const entries = Object.entries(attributes);

    if (entries.length === 0) {
      return [{}];
    }

    const normalizedEntries = entries.map(([key, value]) => ({
      key,
      values: Array.isArray(value) ? value : [value],
    }));

    const combinations: Array<Record<string, string | number>> = [];

    const combine = (position: number, current: Record<string, string | number>) => {
      if (position >= normalizedEntries.length) {
        combinations.push({ ...current });
        return;
      }

      const entry = normalizedEntries[position];
      entry.values.forEach((value) => {
        combine(position + 1, {
          ...current,
          [entry.key]: value,
        });
      });
    };

    combine(0, {});

    return combinations;
  }

  private getPhysicalAttributeValue(
    physicalAttributes: Variant['physical_attributes'],
    key: 'length' | 'width' | 'height' | 'weight',
    fallback: number,
  ): number {
    const value =
      physicalAttributes && typeof physicalAttributes === 'object'
        ? (physicalAttributes as any)[key]
        : fallback;
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }
}
