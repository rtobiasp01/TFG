import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../../interfaces/product';
import { ProductService } from '../../../services/product-service';
import { Variant } from '../../../interfaces/variant';

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
  readonly variantesProducto = signal<Array<Record<string, unknown>>>([]);

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

        if (this.variantesProducto().length > 0) {
          this.imagenPrincipal.set(this.selectedVariant()?.imagenes?.[0]);
          this.galeriaActual.set(this.selectedVariant()?.imagenes ?? []);
        } else {
          this.imagenPrincipal.set(this.product()?.image);
          this.galeriaActual.set(this.product()?.gallery ?? []);
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

  // Devuelve todas las variantes del producto actual
  private setProductAttributes() {
    const variantes = this.product()?.variantes ?? [];

    return variantes.map((variant) => {
      const { imagenes, physical_attributes, precio_adicional, sku, stock_quantity, ...resto } =
        variant;

      return resto;
    });
  }
}
