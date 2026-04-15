import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../../interfaces/product';
import { ProductService } from '../../../services/product-service';
import { CartService } from '../../../services/cart-service';
import { Variant } from '../../../interfaces/variant';
import { UploadService } from '../../../services/upload-service';
import { CustomizationConfig, UserCustomization } from '../../../interfaces/customization';

const API_BASE_URL = 'http://localhost:3000';

type VariantValue = string | number;

interface VariantOptionGroup {
  key: string;
  values: VariantValue[];
}

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
})
export class ProductDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly uploadService = inject(UploadService);

  readonly product = signal<Product | null>(null);
  readonly selectedVariant = signal<Variant | undefined>(undefined);
  readonly customizationConfig = signal<CustomizationConfig | null>(null);
  readonly customizationErrors = signal<string[]>([]);
  readonly customText = signal<string>('');
  readonly customImagePreview = signal<string>('');
  readonly customImageFile = signal<File | null>(null);
  readonly isUploadingCustomization = signal<boolean>(false);

  readonly imagenPrincipal = signal<string | undefined>('');
  readonly galeriaActual = signal<string[]>([]);
  readonly variantesProducto = signal<VariantOptionGroup[]>([]);
  readonly selectedAttributes = signal<Record<string, VariantValue>>({});

  constructor() {
    this.setProductoActual();
  }

  // Obtiene el producto mediante su sku
  private setProductoActual(): void {
    const sku = this.route.snapshot.paramMap.get('sku');
    if (!sku) {
      this.product.set(null);
      return;
    }

    this.productService.getBySku(sku).subscribe({
      next: (product) => {
        this.product.set(product);
        this.customizationConfig.set(
          product?.customization_config ?? this.getDefaultCustomizationConfig(),
        );
        const allVariants = product?.variantes ?? [];
        const initialVariant = allVariants[0];

        this.selectedVariant.set(initialVariant);
        this.variantesProducto.set(this.setProductAttributes());
        this.selectedAttributes.set(
          initialVariant ? this.extractVariantAttributes(initialVariant) : {},
        );
        this.updateGallery(initialVariant);
      },
      error: () => {
        this.product.set(null);
        this.selectedVariant.set(undefined);
      },
    });
  }

  // Cambia la imagen principal al seleccionar una de la galeria
  changeImage(imagen: string) {
    this.imagenPrincipal.set(imagen);
  }

  stockAvailability(): boolean {
    const variantStock = this.selectedVariant()?.stock_quantity;
    if (typeof variantStock === 'number') {
      return variantStock > 0;
    }

    const productStock = this.product()?.stock_quantity ?? 0;
    return productStock > 0;
  }

  optionTrack(value: VariantValue): string {
    return String(value);
  }

  isSelectedOption(key: string, value: VariantValue): boolean {
    return this.selectedAttributes()[key] === value;
  }

  selectVariantOption(key: string, value: VariantValue): void {
    const groupIndex = this.variantesProducto().findIndex((group) => group.key === key);
    const nextSelectedAttributes = { ...this.selectedAttributes(), [key]: value };

    if (groupIndex >= 0) {
      const lowerKeys = this.variantesProducto()
        .slice(groupIndex + 1)
        .map((group) => group.key);

      lowerKeys.forEach((lowerKey) => {
        delete nextSelectedAttributes[lowerKey];
      });
    }

    this.selectedAttributes.set(nextSelectedAttributes);
    this.updateSelectedVariantFromAttributes();
  }

  getAvailableValues(groupKey: string, groupIndex: number): VariantValue[] {
    const variants = this.product()?.variantes ?? [];
    const selectedAttributes = this.selectedAttributes();
    const previousGroupKeys = this.variantesProducto()
      .slice(0, groupIndex)
      .map((group) => group.key);

    const filteredVariants = variants.filter((variant) => {
      const variantAttributes = this.extractVariantAttributes(variant);

      return previousGroupKeys.every((key) => {
        const selectedValue = selectedAttributes[key];
        return selectedValue === undefined || variantAttributes[key] === selectedValue;
      });
    });

    return Array.from(
      new Set(
        filteredVariants
          .map((variant) => this.extractVariantAttributes(variant)[groupKey])
          .filter((value): value is VariantValue => value !== undefined),
      ),
    );
  }

  // Devuelve opciones por atributo para construir botones de combinacion
  private setProductAttributes(): VariantOptionGroup[] {
    const variantes = this.product()?.variantes ?? [];
    const optionsMap = new Map<string, Set<VariantValue>>();

    variantes.forEach((variant) => {
      const attributes = this.extractVariantAttributes(variant);

      Object.entries(attributes).forEach(([key, value]) => {
        const currentValues = optionsMap.get(key) ?? new Set<VariantValue>();
        currentValues.add(value);
        optionsMap.set(key, currentValues);
      });
    });

    return Array.from(optionsMap.entries()).map(([key, values]) => ({
      key,
      values: Array.from(values),
    }));
  }

  private extractVariantAttributes(variant: Variant): Record<string, VariantValue> {
    const {
      imagenes,
      physical_attributes,
      precio_adicional,
      sku,
      stock_quantity,
      attributes,
      ...resto
    } = variant;
    const mergedAttributes: Record<string, unknown> = {
      ...resto,
      ...(attributes && typeof attributes === 'object' && !Array.isArray(attributes)
        ? attributes
        : {}),
    };
    const normalizedAttributes: Record<string, VariantValue> = {};

    Object.entries(mergedAttributes).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        normalizedAttributes[key] = value;
        return;
      }

      if (Array.isArray(value)) {
        const firstPrimitiveValue = value.find(
          (item) => typeof item === 'string' || typeof item === 'number',
        );

        if (typeof firstPrimitiveValue === 'string' || typeof firstPrimitiveValue === 'number') {
          normalizedAttributes[key] = firstPrimitiveValue;
        }
      }
    });

    return normalizedAttributes;
  }

  private updateSelectedVariantFromAttributes(): void {
    const selectedAttributes = this.selectedAttributes();
    const variants = this.product()?.variantes ?? [];

    const matchedVariant = variants.find((variant) => {
      const variantAttributes = this.extractVariantAttributes(variant);

      return Object.entries(selectedAttributes).every(
        ([key, value]) => variantAttributes[key] === value,
      );
    });

    if (!matchedVariant) {
      return;
    }

    this.selectedVariant.set(matchedVariant);
    this.updateGallery(matchedVariant);
  }

  private updateGallery(variant: Variant | undefined): void {
    const productImage = this.product()?.image ?? '';
    const productGallery = this.product()?.gallery ?? [];
    const variantImages = variant?.imagenes ?? [];
    const filterValidImages = (image: string | undefined): image is string => Boolean(image);
    const uniqueImages = (images: string[]) => Array.from(new Set(images));

    this.imagenPrincipal.set(productImage);

    if (variantImages.length > 0) {
      this.galeriaActual.set(
        uniqueImages([productImage, ...variantImages].filter(filterValidImages)),
      );
      return;
    }

    this.galeriaActual.set(
      uniqueImages([productImage, ...productGallery].filter(filterValidImages)),
    );
  }

  addToCart(): void {
    const product = this.product();
    const selectedVariant = this.selectedVariant();

    if (!product) {
      return;
    }

    if (product.type === 'custom-personalized') {
      const localValidationErrors = this.validateCustomizationLocally();

      if (localValidationErrors.length > 0) {
        this.customizationErrors.set(localValidationErrors);
        return;
      }

      if (this.customImageFile()) {
        this.uploadAndAddCustomProduct();
        return;
      }

      this.validateCustomizationOnServerAndAdd();
      return;
    }

    const isSimple = (product?.variantes?.length ?? 0) === 0 || !selectedVariant;
    const basePrice = product.price;
    const productImage = product.image;
    const additionalPrice = selectedVariant?.precio_adicional ?? 0;

    if (isSimple) {
      this.cartService.addItem({
        productId: product._id,
        productTitle: product.title,
        productType: 'simple',
        productImage,
        basePrice,
        simpleSku: product.sku,
        quantity: 1,
        availableStock: product.stock_quantity,
      });
    } else {
      this.cartService.addItem({
        productId: product._id,
        productTitle: product.title,
        productType: 'variable',
        productImage,
        basePrice,
        variantSku: selectedVariant?.sku,
        variantAttributes: this.selectedAttributes(),
        variantAdditionalPrice: additionalPrice,
        quantity: 1,
        availableStock: selectedVariant?.stock_quantity ?? 0,
      });
    }
  }

  isCustomPersonalizedProduct(): boolean {
    return this.product()?.type === 'custom-personalized';
  }

  onCustomizationTextInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.customText.set(input.value);
    this.customizationErrors.set([]);
  }

  onCustomizationImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.customImageFile.set(file);
    this.customizationErrors.set([]);
    this.customImagePreview.set('');
    this.isUploadingCustomization.set(true);

    this.uploadService.subirArchivoSinFondo(file).subscribe({
      next: (response) => {
        this.customImagePreview.set(response.processedFileUrl);
        this.isUploadingCustomization.set(false);
      },
      error: () => {
        this.isUploadingCustomization.set(false);
        this.customizationErrors.set([
          'No se pudo procesar la imagen sin fondo. Inténtalo de nuevo.',
        ]);
      },
    });
  }

  removeCustomizationImage(): void {
    this.customImageFile.set(null);
    this.customImagePreview.set('');
    this.isUploadingCustomization.set(false);
  }

  customizationAcceptAttribute(): string {
    const allowedFormats = this.customizationConfig()?.imageFormats ?? [
      'jpg',
      'jpeg',
      'png',
      'webp',
    ];
    return allowedFormats.map((format) => `.${format.replace(/^[.]+/, '')}`).join(',');
  }

  private validateCustomizationLocally(): string[] {
    const product = this.product();
    const customizationConfig = this.customizationConfig();

    if (!product || !customizationConfig) {
      return [];
    }

    const errors: string[] = [];
    const customText = this.customText().trim();
    const customImageFile = this.customImageFile();

    if (this.isUploadingCustomization()) {
      errors.push('La imagen todavía se está procesando. Espera a que termine.');
      return errors;
    }

    if (customImageFile && !customizationConfig.allowImage) {
      errors.push('Este producto no permite subir imagen.');
    }

    if (customText && !customizationConfig.allowText) {
      errors.push('Este producto no permite texto personalizado.');
    }

    if (customText.length > customizationConfig.maxTextLength) {
      errors.push(
        `El texto supera el máximo permitido de ${customizationConfig.maxTextLength} caracteres.`,
      );
    }

    if (customImageFile) {
      const allowedFormats = (customizationConfig.imageFormats ?? []).map((format) =>
        format.toLowerCase(),
      );
      const fileExtension = customImageFile.name.split('.').pop()?.toLowerCase() ?? '';

      if (customImageFile.size > customizationConfig.maxImageSize) {
        errors.push(
          `La imagen supera el tamaño máximo de ${customizationConfig.maxImageSize} bytes.`,
        );
      }

      if (allowedFormats.length > 0 && !allowedFormats.includes(fileExtension)) {
        errors.push(`El formato ${fileExtension || 'seleccionado'} no está permitido.`);
      }
    }

    return errors;
  }

  private validateCustomizationOnServerAndAdd(uploadedImageUrl?: string): void {
    const product = this.product();

    if (!product) {
      return;
    }

    this.productService
      .validateCustomization({
        product_id: product._id,
        customization: this.buildCustomizationPayload(uploadedImageUrl),
      })
      .subscribe({
        next: (result) => {
          if (result?.valid === false || result?.errors?.length > 0) {
            this.customizationErrors.set(result.errors ?? ['La personalización no es válida.']);
            return;
          }

          this.finalizeCustomProductAddToCart(uploadedImageUrl);
        },
        error: () => {
          this.customizationErrors.set(['No se ha podido validar la personalización.']);
        },
      });
  }

  private uploadAndAddCustomProduct(): void {
    const uploadedImageUrl = this.customImagePreview();

    if (!uploadedImageUrl) {
      this.customizationErrors.set(['La imagen todavía se está procesando.']);
      return;
    }

    this.validateCustomizationOnServerAndAdd(uploadedImageUrl);
  }

  private finalizeCustomProductAddToCart(uploadedImageUrl?: string): void {
    const product = this.product();
    const selectedVariant = this.selectedVariant();

    if (!product) {
      return;
    }

    const isSimple = (product?.variantes?.length ?? 0) === 0 || !selectedVariant;
    const basePrice = product.price;
    const productImage = product.image;
    const additionalPrice = selectedVariant?.precio_adicional ?? 0;
    const customization = this.buildCustomizationPayload(uploadedImageUrl);

    if (isSimple) {
      this.cartService.addItem({
        productId: product._id,
        productTitle: product.title,
        productType: 'custom-personalized',
        productImage,
        basePrice,
        simpleSku: product.sku,
        quantity: 1,
        availableStock: product.stock_quantity,
        customization,
      });
      return;
    }

    this.cartService.addItem({
      productId: product._id,
      productTitle: product.title,
      productType: 'custom-personalized',
      productImage,
      basePrice,
      variantSku: selectedVariant?.sku,
      variantAttributes: this.selectedAttributes(),
      variantAdditionalPrice: additionalPrice,
      quantity: 1,
      availableStock: selectedVariant?.stock_quantity ?? 0,
      customization,
    });
  }

  private buildCustomizationPayload(uploadedImageUrl?: string): UserCustomization {
    return {
      uploadedImageUrl: uploadedImageUrl ?? this.customImagePreview() ?? null,
      customText: this.customText().trim() || null,
      timestamp: Date.now(),
    };
  }

  private getDefaultCustomizationConfig(): CustomizationConfig {
    return {
      allowImage: true,
      allowText: true,
      maxImageSize: 5242880,
      maxTextLength: 200,
      imageFormats: ['jpg', 'jpeg', 'png', 'webp'],
      textPlaceholder: 'Escribe un mensaje personalizado',
    };
  }
}
