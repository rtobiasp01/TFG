import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../interfaces/product';
import { ProductService } from '../../../services/product-service';
import { CartService } from '../../../services/cart-service';
import { AuthService } from '../../../services/auth-service';
import { ReviewService } from '../../../services/review-service';
import { Variant } from '../../../interfaces/variant';
import { Review } from '../../../interfaces/review';
import { UploadService } from '../../../services/upload-service';
import {
  CustomImagePlacement,
  CustomizationConfig,
  UserCustomization,
} from '../../../interfaces/customization';

const API_BASE_URL = 'http://localhost:3000';
const DEFAULT_IMAGE_PLACEMENT: CustomImagePlacement = {
  xPercent: 50,
  yPercent: 50,
  widthPercent: 56,
  heightPercent: 56,
};

const DEFAULT_TEXT_PLACEMENT: CustomImagePlacement = {
  xPercent: 50,
  yPercent: 80,
  widthPercent: 70,
  heightPercent: 22,
};

type VariantValue = string | number;

interface VariantOptionGroup {
  key: string;
  values: VariantValue[];
}

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
})
export class ProductDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly uploadService = inject(UploadService);
  private readonly authService = inject(AuthService);
  private readonly reviewService = inject(ReviewService);

  readonly product = signal<Product | null>(null);
  readonly relatedProducts = signal<Product[]>([]);
  readonly selectedVariant = signal<Variant | undefined>(undefined);
  readonly catalogQueryParams = signal<Record<string, string>>({});
  readonly customizationConfig = signal<CustomizationConfig | null>(null);
  readonly customizationErrors = signal<string[]>([]);
  readonly customText = signal<string>('');
  readonly customImagePreview = signal<string>('');
  readonly customImageFile = signal<File | null>(null);
  readonly isUploadingCustomization = signal<boolean>(false);
  readonly isAddingToCart = signal<boolean>(false);
  readonly addCartMessage = signal<string>('');
  readonly addCartInlineMessage = signal<string>('');

  readonly imagenPrincipal = signal<string | undefined>('');
  readonly galeriaActual = signal<string[]>([]);
  readonly variantesProducto = signal<VariantOptionGroup[]>([]);
  readonly selectedAttributes = signal<Record<string, VariantValue>>({});

  // Reviews signals
  readonly reviews = signal<Review[]>([]);
  readonly isLoadingReviews = signal<boolean>(false);
  readonly reviewErrorMessage = signal<string>('');
  readonly reviewSuccessMessage = signal<string>('');
  readonly newReview = signal<Review>({
    email: '',
    product_id: '',
    message: '',
    rating: 5,
  });
  readonly showReviewForm = signal<boolean>(false);
  readonly isSubmittingReview = signal<boolean>(false);
  @ViewChild('relatedProductsViewport')
  private relatedProductsViewport?: ElementRef<HTMLDivElement>;
  readonly customTextPreview = computed(() => {
    const rawText = this.customText();
    const trimmed = rawText.trim();
    return trimmed.length > 0 ? rawText : '';
  });
  readonly customOverlayStyles = computed(() => {
    const placement = this.resolveImagePlacement();

    return {
      left: `${placement.xPercent}%`,
      top: `${placement.yPercent}%`,
      width: `${placement.widthPercent}%`,
      height: `${placement.heightPercent}%`,
    };
  });
  readonly customTextOverlayStyles = computed(() => {
    const placement = this.resolveTextPlacement();

    return {
      left: `${placement.xPercent}%`,
      top: `${placement.yPercent}%`,
      width: `${placement.widthPercent}%`,
      height: `${placement.heightPercent}%`,
    };
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.catalogQueryParams.set(this.extractCatalogQueryParams(params));
    });

    this.route.paramMap.subscribe(() => {
      this.setProductoActual();
    });
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
        this.newReview.set({
          email: this.authService.currentUser()?.email || '',
          product_id: product._id,
          message: '',
          rating: 5,
        });
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
        this.loadRelatedProducts(product);
        this.loadProductReviews(product._id);
      },
      error: () => {
        this.product.set(null);
        this.selectedVariant.set(undefined);
        this.relatedProducts.set([]);
      },
    });
  }

  private loadRelatedProducts(currentProduct: Product | null | undefined): void {
    if (!currentProduct) {
      this.relatedProducts.set([]);
      return;
    }

    this.productService.getAll().subscribe({
      next: (products) => {
        const currentCategories = new Set(currentProduct.categoria ?? []);

        const related = products
          .filter((product) => product.sku !== currentProduct.sku)
          .map((product) => {
            const productCategories = product.categoria ?? [];
            const sharedCategories = productCategories.filter((category) =>
              currentCategories.has(category),
            ).length;

            return {
              product,
              sharedCategories,
            };
          })
          .filter(({ sharedCategories }) => sharedCategories > 0)
          .sort((left, right) => {
            if (right.sharedCategories !== left.sharedCategories) {
              return right.sharedCategories - left.sharedCategories;
            }

            return left.product.title.localeCompare(right.product.title);
          })
          .slice(0, 4)
          .map(({ product }) => product);

        this.relatedProducts.set(related);
      },
      error: () => {
        this.relatedProducts.set([]);
      },
    });
  }

  scrollRelatedProducts(direction: 'previous' | 'next'): void {
    const viewport = this.relatedProductsViewport?.nativeElement;

    if (!viewport) {
      return;
    }

    const slideWidth = viewport.clientWidth / 3;
    const scrollDistance = direction === 'next' ? slideWidth : -slideWidth;

    viewport.scrollBy({
      left: scrollDistance,
      behavior: 'smooth',
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
      const lowerGroups = this.variantesProducto().slice(groupIndex + 1);

      lowerGroups.forEach((lowerGroup) => {
        delete nextSelectedAttributes[lowerGroup.key];
      });

      this.selectedAttributes.set(nextSelectedAttributes);

      lowerGroups.forEach((lowerGroup) => {
        const lowerGroupIndex = this.variantesProducto().findIndex((g) => g.key === lowerGroup.key);
        const availableValues = this.getAvailableValues(lowerGroup.key, lowerGroupIndex);
        if (availableValues.length > 0) {
          nextSelectedAttributes[lowerGroup.key] = availableValues[0];
          this.selectedAttributes.set({ ...nextSelectedAttributes });
        }
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

    if (variantImages.length > 0) {
      const gallery = uniqueImages([productImage, ...variantImages].filter(filterValidImages));
      this.imagenPrincipal.set(variantImages[0]);
      this.galeriaActual.set(gallery);
      return;
    }

    this.imagenPrincipal.set(productImage);
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

    // Provide visual feedback when adding to cart
    this.isAddingToCart.set(true);

    // Check stock before attempting to add
    const willExceedStock = this.willExceedStockForAdd({
      productId: product._id,
      productType: isSimple ? 'simple' : 'variable',
      simpleSku: isSimple ? product.sku : undefined,
      variantSku: !isSimple ? selectedVariant?.sku : undefined,
      variantAttributes: !isSimple ? this.selectedAttributes() : undefined,
      availableStock: isSimple ? product.stock_quantity : (selectedVariant?.stock_quantity ?? 0),
      quantityToAdd: 1,
    });

    if (willExceedStock) {
      this.addCartInlineMessage.set('No hay suficiente stock para añadir más unidades');
      setTimeout(() => this.addCartInlineMessage.set(''), 3500);
      // stop spinner
      this.isAddingToCart.set(false);
      return;
    }

    // Trigger fly-to-cart animation (best-effort)
    const imageSrc = this.imagenPrincipal() || product.image || '';
    const animatePromise = this.flyToCart(imageSrc);

    try {
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

      this.addCartMessage.set('Añadido al carrito');
      setTimeout(() => this.addCartMessage.set(''), 1800);
      // Wait for animation to finish (max 1s) before hiding spinner
      animatePromise.finally(() => setTimeout(() => this.isAddingToCart.set(false), 120));
    } finally {
      // nothing here
    }
  }

  private willExceedStockForAdd(opts: {
    productId: string;
    productType: 'simple' | 'variable' | 'custom-personalized';
    simpleSku?: string;
    variantSku?: string | undefined;
    variantAttributes?: Record<string, string | number> | undefined;
    availableStock: number | undefined;
    quantityToAdd: number;
  }): boolean {
    try {
      const cart = this.cartService.cart();
      const normalize = (v: number | undefined) =>
        Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0;
      const targetStock = normalize(opts.availableStock);

      const matches = cart.items.find((item) => {
        if (item.productId !== opts.productId) return false;
        if (item.productType !== opts.productType) return false;

        if (opts.productType === 'simple') {
          return item.simpleSku === opts.simpleSku;
        }

        // variable or custom-personalized: match variantSku + attributes
        if (opts.variantSku && item.variantSku !== opts.variantSku) return false;

        const left = item.variantAttributes ?? {};
        const right = opts.variantAttributes ?? {};

        try {
          return (
            JSON.stringify(left, Object.keys(left).sort()) ===
            JSON.stringify(right, Object.keys(right).sort())
          );
        } catch (e) {
          return false;
        }
      });

      const existingQty = matches ? matches.quantity : 0;

      return existingQty + opts.quantityToAdd > targetStock;
    } catch (e) {
      return false;
    }
  }

  private flyToCart(imageSrc: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const cartEl = document.getElementById('app-cart-link');
        const srcImgEl = document.querySelector('.img-principal__image') as HTMLImageElement | null;

        if (!cartEl || !srcImgEl) {
          resolve();
          return;
        }

        const srcRect = srcImgEl.getBoundingClientRect();
        const destRect = cartEl.getBoundingClientRect();

        const flyImg = document.createElement('img');
        flyImg.src = imageSrc;
        flyImg.style.position = 'fixed';
        flyImg.style.left = `${srcRect.left}px`;
        flyImg.style.top = `${srcRect.top}px`;
        flyImg.style.width = `${srcRect.width}px`;
        flyImg.style.height = `${srcRect.height}px`;
        flyImg.style.transition = 'transform 650ms cubic-bezier(.2,.9,.2,1), opacity 600ms ease';
        flyImg.style.zIndex = '9999';
        flyImg.style.pointerEvents = 'none';
        flyImg.style.borderRadius = '8px';
        flyImg.style.boxShadow = '0 10px 30px rgba(2,6,23,0.18)';

        document.body.appendChild(flyImg);

        // Calculate transform
        const translateX = destRect.left + destRect.width / 2 - (srcRect.left + srcRect.width / 2);
        const translateY = destRect.top + destRect.height / 2 - (srcRect.top + srcRect.height / 2);
        const scale = Math.max(0.18, Math.min(0.45, destRect.width / srcRect.width));

        // Force reflow then apply transform
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        flyImg.getBoundingClientRect();

        requestAnimationFrame(() => {
          flyImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
          flyImg.style.opacity = '0.0';
        });

        const cleanup = () => {
          try {
            document.body.removeChild(flyImg);
            // Trigger cart bounce on destination element
            try {
              if (cartEl) {
                cartEl.classList.add('cart-bounce');
                const removeBounce = () => {
                  try {
                    cartEl.classList.remove('cart-bounce');
                  } catch (e) {}
                };

                cartEl.addEventListener('animationend', removeBounce, { once: true });
                // Safety remove in case animationend doesn't fire
                setTimeout(removeBounce, 800);
              }
            } catch (e) {}
          } catch (e) {}
          resolve();
        };

        flyImg.addEventListener('transitionend', cleanup, { once: true });

        // Safety timeout
        setTimeout(cleanup, 1000);
      } catch (e) {
        resolve();
      }
    });
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
    const previousPreview = this.customImagePreview();

    if (previousPreview.startsWith('blob:')) {
      URL.revokeObjectURL(previousPreview);
    }

    this.customImageFile.set(file);
    this.customizationErrors.set([]);
    this.customImagePreview.set('');

    if (!this.isBackgroundRemovalEnabled()) {
      this.customImagePreview.set(URL.createObjectURL(file));
      this.isUploadingCustomization.set(false);
      return;
    }

    this.isUploadingCustomization.set(true);
    this.uploadService.previsualizarArchivoSinFondo(file, true).subscribe({
      next: (response) => {
        this.customImagePreview.set(response.previewDataUrl);
        this.isUploadingCustomization.set(false);
      },
      error: () => {
        this.isUploadingCustomization.set(false);
        this.customizationErrors.set([
          'No se pudo generar la previsualización sin fondo. Inténtalo de nuevo.',
        ]);
      },
    });
  }

  removeCustomizationImage(): void {
    const preview = this.customImagePreview();

    if (preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    this.customImageFile.set(null);
    this.customImagePreview.set('');
    this.isUploadingCustomization.set(false);
  }

  customizationAcceptAttribute(): string {
    if (!this.isBackgroundRemovalEnabled()) {
      return '.png';
    }

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
    const imageFile = this.customImageFile();

    if (!imageFile) {
      this.customizationErrors.set(['No se ha seleccionado ninguna imagen.']);
      return;
    }

    if (!this.isBackgroundRemovalEnabled()) {
      this.isUploadingCustomization.set(true);
      this.uploadService.subirArchivo(imageFile).subscribe({
        next: (response: any) => {
          const uploadedImageUrl = `${API_BASE_URL}/${String(response?.fileDetails?.path || '').replace(/\\/g, '/')}`;
          this.customImagePreview.set(uploadedImageUrl);
          this.isUploadingCustomization.set(false);
          this.validateCustomizationOnServerAndAdd(uploadedImageUrl);
        },
        error: () => {
          this.isUploadingCustomization.set(false);
          this.customizationErrors.set(['No se pudo subir la imagen PNG. Inténtalo de nuevo.']);
        },
      });
      return;
    }

    this.isUploadingCustomization.set(true);
    this.uploadService.subirArchivoSinFondo(imageFile, true).subscribe({
      next: (response) => {
        this.customImagePreview.set(response.processedFileUrl);
        this.isUploadingCustomization.set(false);
        this.validateCustomizationOnServerAndAdd(response.processedFileUrl);
      },
      error: () => {
        this.isUploadingCustomization.set(false);
        this.customizationErrors.set([
          'No se pudo procesar la imagen sin fondo. Inténtalo de nuevo.',
        ]);
      },
    });
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
      const willExceed = this.willExceedStockForAdd({
        productId: product._id,
        productType: 'custom-personalized',
        simpleSku: product.sku,
        availableStock: product.stock_quantity,
        quantityToAdd: 1,
      });

      if (willExceed) {
        this.addCartInlineMessage.set('No hay suficiente stock para añadir más unidades');
        setTimeout(() => this.addCartInlineMessage.set(''), 3500);
        return;
      }

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

    const willExceed = this.willExceedStockForAdd({
      productId: product._id,
      productType: 'custom-personalized',
      variantSku: selectedVariant?.sku,
      variantAttributes: this.selectedAttributes(),
      availableStock: selectedVariant?.stock_quantity ?? 0,
      quantityToAdd: 1,
    });

    if (willExceed) {
      this.addCartInlineMessage.set('No hay suficiente stock para añadir más unidades');
      setTimeout(() => this.addCartInlineMessage.set(''), 3500);
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
      enableBackgroundRemoval: true,
      allowText: true,
      maxImageSize: 5242880,
      maxTextLength: 200,
      imageFormats: ['jpg', 'jpeg', 'png', 'webp'],
      textPlaceholder: 'Escribe un mensaje personalizado',
      imagePlacement: { ...DEFAULT_IMAGE_PLACEMENT },
      textPlacement: { ...DEFAULT_TEXT_PLACEMENT },
    };
  }

  private resolveImagePlacement(): CustomImagePlacement {
    const rawPlacement = this.customizationConfig()?.imagePlacement;

    if (!rawPlacement) {
      return DEFAULT_IMAGE_PLACEMENT;
    }

    const clampPercent = (
      value: number | undefined,
      min: number,
      max: number,
      fallback: number,
    ): number => {
      const parsed = Number(value);

      if (!Number.isFinite(parsed)) {
        return fallback;
      }

      return Math.min(max, Math.max(min, parsed));
    };

    return {
      xPercent: clampPercent(rawPlacement.xPercent, 0, 100, DEFAULT_IMAGE_PLACEMENT.xPercent),
      yPercent: clampPercent(rawPlacement.yPercent, 0, 100, DEFAULT_IMAGE_PLACEMENT.yPercent),
      widthPercent: clampPercent(
        rawPlacement.widthPercent,
        1,
        100,
        DEFAULT_IMAGE_PLACEMENT.widthPercent,
      ),
      heightPercent: clampPercent(
        rawPlacement.heightPercent,
        1,
        100,
        DEFAULT_IMAGE_PLACEMENT.heightPercent,
      ),
    };
  }

  private resolveTextPlacement(): CustomImagePlacement {
    const rawPlacement =
      this.customizationConfig()?.textPlacement ?? this.customizationConfig()?.imagePlacement;

    if (!rawPlacement) {
      return DEFAULT_TEXT_PLACEMENT;
    }

    const clampPercent = (
      value: number | undefined,
      min: number,
      max: number,
      fallback: number,
    ): number => {
      const parsed = Number(value);

      if (!Number.isFinite(parsed)) {
        return fallback;
      }

      return Math.min(max, Math.max(min, parsed));
    };

    return {
      xPercent: clampPercent(rawPlacement.xPercent, 0, 100, DEFAULT_TEXT_PLACEMENT.xPercent),
      yPercent: clampPercent(rawPlacement.yPercent, 0, 100, DEFAULT_TEXT_PLACEMENT.yPercent),
      widthPercent: clampPercent(
        rawPlacement.widthPercent,
        1,
        100,
        DEFAULT_TEXT_PLACEMENT.widthPercent,
      ),
      heightPercent: clampPercent(
        rawPlacement.heightPercent,
        1,
        100,
        DEFAULT_TEXT_PLACEMENT.heightPercent,
      ),
    };
  }

  private isBackgroundRemovalEnabled(): boolean {
    const config = this.customizationConfig();
    return config?.enableBackgroundRemoval !== false;
  }

  private extractCatalogQueryParams(
    params: import('@angular/router').ParamMap,
  ): Record<string, string> {
    const queryParams: Record<string, string> = {};

    const categoria = params.get('categoria');
    const search = params.get('search');
    const sort = params.get('sort');

    if (categoria) {
      queryParams['categoria'] = categoria;
    }

    if (search) {
      queryParams['search'] = search;
    }

    if (sort) {
      queryParams['sort'] = sort;
    }

    return queryParams;
  }

  // Reviews Methods
  private loadProductReviews(productId: string): void {
    this.isLoadingReviews.set(true);
    this.reviewErrorMessage.set('');

    this.reviewService.getReviewsByProductId(productId).subscribe({
      next: (reviews) => {
        this.reviews.set(reviews);
        this.isLoadingReviews.set(false);
      },
      error: (error) => {
        this.reviewErrorMessage.set('Error al cargar las reseñas');
        this.isLoadingReviews.set(false);
        console.error('Error loading reviews:', error);
      },
    });
  }

  onSubmitReview(): void {
    if (!this.authService.isAuthenticated()) {
      this.reviewErrorMessage.set('Debes iniciar sesión para dejar una reseña');
      return;
    }

    this.isSubmittingReview.set(true);
    this.reviewErrorMessage.set('');
    this.reviewSuccessMessage.set('');

    this.reviewService.createReview(this.newReview()).subscribe({
      next: (response) => {
        this.reviewSuccessMessage.set('Reseña creada exitosamente');
        this.resetReviewForm();
        const productId = this.product()?._id;
        if (productId) {
          this.loadProductReviews(productId);
        }
        this.isSubmittingReview.set(false);

        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => this.reviewSuccessMessage.set(''), 3000);
      },
      error: (error) => {
        this.reviewErrorMessage.set(
          error.error?.error || 'Error al crear la reseña. Intenta de nuevo.',
        );
        this.isSubmittingReview.set(false);
        console.error('Error creating review:', error);
      },
    });
  }

  onDeleteReview(reviewId: string | undefined): void {
    if (!reviewId) return;

    if (confirm('¿Estás seguro de que deseas eliminar esta reseña?')) {
      this.reviewService.deleteReview(reviewId).subscribe({
        next: () => {
          this.reviewSuccessMessage.set('Reseña eliminada exitosamente');
          const productId = this.product()?._id;
          if (productId) {
            this.loadProductReviews(productId);
          }

          // Limpiar mensaje de éxito después de 3 segundos
          setTimeout(() => this.reviewSuccessMessage.set(''), 3000);
        },
        error: (error) => {
          this.reviewErrorMessage.set('Error al eliminar la reseña');
          console.error('Error deleting review:', error);
        },
      });
    }
  }

  toggleReviewForm(): void {
    if (!this.authService.isAuthenticated()) {
      this.reviewErrorMessage.set('Debes iniciar sesión para dejar una reseña');
      return;
    }

    this.showReviewForm.set(!this.showReviewForm());
    if (!this.showReviewForm()) {
      this.resetReviewForm();
    }
  }

  private resetReviewForm(): void {
    this.newReview.set({
      email: this.authService.currentUser()?.email || '',
      product_id: this.product()?._id || '',
      message: '',
      rating: 5,
    });
    this.showReviewForm.set(false);
  }

  getRatingStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  isStarFilled(star: number, rating: number): boolean {
    return star <= rating;
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
}
