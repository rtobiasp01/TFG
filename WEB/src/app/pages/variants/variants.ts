import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ProductService } from '../../services/product-service';
import { Product } from '../../interfaces/product';
import { Variant } from '../../interfaces/variant';

interface VariantRow {
  product_id: string;
  product_title: string;
  product_sku: string;
  variant_sku: string;
  attributes: string;
  stock: number;
  precio_adicional: number;
  precio_final: number;
}

@Component({
  selector: 'app-variants',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './variants.html',
  styleUrl: './variants.css',
})
export class Variants {
  private readonly productService = inject(ProductService);

  readonly variants = signal<VariantRow[]>([]);

  constructor() {
    this.productService.getAll().subscribe({
      next: (products) => {
        this.variants.set(this.mapProductsToVariantRows(products));
      },
      error: (error) => {
        console.error('Error al cargar variantes:', error);
        this.variants.set([]);
      },
    });
  }

  private mapProductsToVariantRows(products: Product[]): VariantRow[] {
    return products.flatMap((product) => {
      if (!Array.isArray(product.variantes)) {
        return [];
      }

      return product.variantes.map((variant) => {
        const additionalPrice = Number(variant.precio_adicional) || 0;
        const basePrice = Number(product.price) || 0;

        return {
          product_id: product._id,
          product_title: product.title,
          product_sku: product.sku,
          variant_sku: variant.sku || 'AUTO',
          attributes: this.formatVariantAttributes(variant),
          stock: Number(variant.stock) || 0,
          precio_adicional: additionalPrice,
          precio_final: basePrice + additionalPrice,
        };
      });
    });
  }

  private formatVariantAttributes(variant: Variant): string {
    const reservedKeys = new Set([
      'sku',
      'stock',
      'precio_adicional',
      'imagenes',
      'physical_attributes',
      'attributes',
    ]);

    const topLevelAttributes = Object.entries(variant)
      .filter(([key, value]) => !reservedKeys.has(key) && value !== null && value !== undefined)
      .map(([key, value]) => `${key}: ${value}`);

    const nestedAttributes =
      variant.attributes && typeof variant.attributes === 'object'
        ? Object.entries(variant.attributes).map(([key, value]) => `${key}: ${value}`)
        : [];

    const allAttributes = [...topLevelAttributes, ...nestedAttributes];
    return allAttributes.length > 0 ? allAttributes.join(' | ') : '-';
  }
}
