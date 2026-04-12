import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../../interfaces/product';
import { ProductService } from '../../../services/product-service';
import { Variant } from '../../../interfaces/variant';

type VariantValue = string | number;

interface VariantGroup {
  key: string;
  value: VariantValue;
  children: VariantGroup[];
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

  readonly product = signal<Product | null>(null);
  readonly selectedVariant = signal<Variant | undefined>(undefined);

  readonly imagenPrincipal = signal<string | undefined>('');
  readonly galeriaActual = signal<string[]>([]);
  readonly variantesProducto = signal<VariantGroup[]>([]);

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
        this.selectedVariant.set(product?.variantes?.[0]);
        this.variantesProducto.set(this.setProductAttributes());

        const productImage = this.product()?.image ?? '';
        const variantImages = this.selectedVariant()?.imagenes ?? [];
        const filterValidImages = (image: string | undefined): image is string => Boolean(image);
        const uniqueImages = (images: string[]) => Array.from(new Set(images));

        if (this.variantesProducto().length > 0 && variantImages.length > 0) {
          this.imagenPrincipal.set(productImage);
          this.galeriaActual.set(
            uniqueImages([productImage, ...variantImages].filter(filterValidImages)),
          );
        } else {
          this.imagenPrincipal.set(productImage);
          this.galeriaActual.set(
            uniqueImages(
              [productImage, ...(this.product()?.gallery ?? [])].filter(filterValidImages),
            ),
          );
        }
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

  groupTrack(group: VariantGroup): string {
    return `${group.key}:${group.value}`;
  }

  // Devuelve todas las variantes del producto actual
  private setProductAttributes(): VariantGroup[] {
    const variantes = this.product()?.variantes ?? [];
    const cleanedVariants = variantes.map((variant) => this.cleanVariant(variant));

    return this.buildVariantGroups(cleanedVariants);
  }

  private cleanVariant(variant: Variant): Record<string, unknown> {
    const { imagenes, physical_attributes, precio_adicional, sku, stock_quantity, ...resto } =
      variant;

    return resto;
  }

  private buildVariantGroups(variants: Array<Record<string, unknown>>): VariantGroup[] {
    const groups = new Map<
      string,
      {
        key: string;
        value: VariantValue;
        variants: Array<Record<string, unknown>>;
      }
    >();

    variants.forEach((variant) => {
      const entries = Object.entries(variant).filter(
        ([, value]) => value !== undefined && value !== null,
      );

      if (entries.length === 0) {
        return;
      }

      const [groupKey, rawGroupValue] = entries[0];
      const groupValues = Array.isArray(rawGroupValue) ? rawGroupValue : [rawGroupValue];
      const childVariant = Object.fromEntries(entries.slice(1));

      groupValues.forEach((rawValue) => {
        if (rawValue === undefined || rawValue === null) {
          return;
        }

        const value = this.normalizeVariantValue(rawValue);
        const mapKey = `${groupKey}:${String(value)}`;
        const currentGroup = groups.get(mapKey) ?? {
          key: groupKey,
          value,
          variants: [],
        };

        currentGroup.variants.push(childVariant);
        groups.set(mapKey, currentGroup);
      });
    });

    return Array.from(groups.values()).map((group) => ({
      key: group.key,
      value: group.value,
      children: this.buildVariantGroups(group.variants),
    }));
  }

  private normalizeVariantValue(value: unknown): VariantValue {
    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }

    return String(value);
  }
}
