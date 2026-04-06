import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PhysicalAttributes } from '../../../interfaces/physical_attributes';
import { Product } from '../../../interfaces/product';
import { Variant } from '../../../interfaces/variant';
import { ProductService } from '../../../services/product-service';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
})
export class ProductDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly variantReservedKeys = new Set([
    '_id',
    'sku',
    'stock',
    'precio_adicional',
    'imagenes',
    'physical_attributes',
    'attributes',
  ]);

  readonly product = signal<Product | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string>('');
  readonly selectedVariantIndex = signal<number>(0);
  readonly selectedImage = signal<string>('');

  readonly variants = computed(() => this.product()?.variantes ?? []);
  readonly selectedVariant = computed<Variant | null>(() => {
    const allVariants = this.variants();
    if (allVariants.length === 0) {
      return null;
    }

    const variantIndex = this.selectedVariantIndex();
    return allVariants[variantIndex] ?? allVariants[0];
  });

  readonly activeGallery = computed<string[]>(() => {
    const selectedVariant = this.selectedVariant();
    const selectedVariantImages = Array.isArray(selectedVariant?.imagenes) ? selectedVariant.imagenes : [];

    if (selectedVariantImages.length > 0) {
      return this.uniqueImages(selectedVariantImages);
    }

    const currentProduct = this.product();
    if (!currentProduct) {
      return [];
    }

    return this.uniqueImages([currentProduct.image, ...(currentProduct.gallery ?? [])]);
  });

  readonly mainImage = computed<string>(() => {
    const explicitSelectedImage = this.selectedImage();
    if (explicitSelectedImage) {
      return explicitSelectedImage;
    }

    const gallery = this.activeGallery();
    if (gallery.length > 0) {
      return gallery[0];
    }

    return this.product()?.image ?? '';
  });

  readonly displayPrice = computed<number>(() => {
    const basePrice = Number(this.product()?.price ?? 0);
    const extra = Number(this.selectedVariant()?.precio_adicional ?? 0);
    return basePrice + extra;
  });

  readonly displayStock = computed<number>(() => {
    const selectedVariant = this.selectedVariant();
    if (selectedVariant) {
      return Number(selectedVariant.stock ?? 0);
    }
    return Number(this.product()?.stock_quantity ?? 0);
  });

  readonly displayStockLabel = computed<string>(() => {
    const selectedVariant = this.selectedVariant();
    if (selectedVariant) {
      return this.displayStock() > 0 ? 'En stock' : 'Sin stock';
    }

    const stockStatus = (this.product()?.stock_status || '').toLowerCase();
    if (stockStatus === 'in_stock') return 'En stock';
    if (stockStatus === 'out_of_stock') return 'Sin stock';
    if (stockStatus === 'on_backorder') return 'Bajo reserva';

    return this.displayStock() > 0 ? 'En stock' : 'Sin stock';
  });

  readonly renderedDescription = computed<string>(() => this.formatDescription(this.product()?.description || ''));

  readonly displayPhysicalAttributes = computed<PhysicalAttributes | null>(() => {
    const variantPhysical = this.selectedVariant()?.physical_attributes;
    if (this.isPhysicalAttributes(variantPhysical)) {
      return variantPhysical;
    }

    const productPhysical = this.product()?.physical_attributes;
    if (this.isPhysicalAttributes(productPhysical)) {
      return productPhysical;
    }

    return null;
  });

  constructor() {
    const routeSku = this.route.snapshot.paramMap.get('sku') || '';
    const stateProduct = history.state?.product as Product | undefined;

    if (stateProduct && stateProduct.sku === routeSku) {
      this.applyProduct(stateProduct);
      this.isLoading.set(false);
      return;
    }

    if (!routeSku) {
      this.errorMessage.set('No se encontró el producto.');
      this.isLoading.set(false);
      return;
    }

    this.productService.getBySku(routeSku).subscribe({
      next: (product) => {
        if (!product) {
          this.errorMessage.set('No se encontró el producto.');
        } else {
          this.applyProduct(product);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el producto.');
        this.isLoading.set(false);
      },
    });
  }

  selectVariant(index: number): void {
    const allVariants = this.variants();
    if (index < 0 || index >= allVariants.length) {
      return;
    }

    this.selectedVariantIndex.set(index);
    const nextImage = allVariants[index]?.imagenes?.[0] || this.product()?.image || '';
    this.selectedImage.set(nextImage);
  }

  selectGalleryImage(imageUrl: string): void {
    this.selectedImage.set(imageUrl);
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  }

  isActiveImage(imageUrl: string): boolean {
    return this.mainImage() === imageUrl;
  }

  isActiveVariant(index: number): boolean {
    return this.selectedVariantIndex() === index;
  }

  getVariantLabel(variant: Variant, index: number): string {
    const variantAttrs = this.getVariantAttributes(variant)
      .slice(0, 2)
      .map(({ key, value }) => `${this.normalizeLabel(key)}: ${this.formatVariantValue(value)}`)
      .join(' · ');

    if (variantAttrs) {
      return variantAttrs;
    }

    return variant.sku || `Variante ${index + 1}`;
  }

  getVariantAttributes(variant: Variant): Array<{ key: string; value: unknown }> {
    const fromAttributes = this.extractVariantAttributes(variant.attributes || {});
    const fromFlatObject = this.extractVariantAttributes(variant);

    const merged = [...fromAttributes, ...fromFlatObject];
    const deduped = new Map<string, unknown>();

    merged.forEach(({ key, value }) => {
      if (!deduped.has(key)) {
        deduped.set(key, value);
      }
    });

    return Array.from(deduped.entries()).map(([key, value]) => ({ key, value }));
  }

  formatVariantValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((item) => String(item)).join(', ');
    }

    if (value === null || value === undefined) {
      return '-';
    }

    return String(value);
  }

  normalizeLabel(rawLabel: string): string {
    return rawLabel
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  hasPhysicalAttributes(): boolean {
    return Boolean(this.displayPhysicalAttributes());
  }

  private applyProduct(product: Product): void {
    this.product.set(product);
    this.selectedVariantIndex.set(0);

    const variantFirstImage = product.variantes?.[0]?.imagenes?.[0];
    const productFirstImage = product.image || product.gallery?.[0] || '';
    this.selectedImage.set(variantFirstImage || productFirstImage);
  }

  private uniqueImages(images: string[]): string[] {
    return Array.from(new Set(images.filter((image) => Boolean(image))));
  }

  private extractVariantAttributes(source: Record<string, unknown>): Array<{ key: string; value: unknown }> {
    return Object.entries(source)
      .filter(([key, value]) => !this.variantReservedKeys.has(key) && value !== null && value !== undefined)
      .map(([key, value]) => ({ key, value }));
  }

  private isPhysicalAttributes(value: unknown): value is PhysicalAttributes {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const attrs = value as Record<string, unknown>;
    return (
      typeof attrs['length'] === 'number' &&
      typeof attrs['width'] === 'number' &&
      typeof attrs['height'] === 'number' &&
      typeof attrs['weight'] === 'number'
    );
  }

  private formatDescription(rawTextOrHtml: string): string {
    if (!rawTextOrHtml) {
      return '';
    }

    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(rawTextOrHtml);
    if (looksLikeHtml) {
      return rawTextOrHtml;
    }

    const escaped = rawTextOrHtml
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const paragraphs = escaped
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter((block) => block.length > 0)
      .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`);

    return paragraphs.join('');
  }
}
