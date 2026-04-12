import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../../interfaces/product';
import { ProductService } from '../../../services/product-service';
import { CartService } from '../../../services/cart-service';
import { Variant } from '../../../interfaces/variant';

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

  readonly product = signal<Product | null>(null);
  readonly selectedVariant = signal<Variant | undefined>(undefined);

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

  stockAvailabilityLabel(): string {
    const variantStock = this.selectedVariant()?.stock_quantity;
    if (typeof variantStock === 'number') {
      return variantStock > 0 ? 'Hay stock' : 'Sin stock';
    }

    const productStock = this.product()?.stock_quantity ?? 0;
    return productStock > 0 ? 'Hay stock' : 'Sin stock';
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
}
