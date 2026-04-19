import { Component, inject, signal } from '@angular/core';
import { ProductService } from '../../../services/product-service';
import { RouterLink } from '@angular/router';
import { Product } from '../../../interfaces/product';
import { CurrencyPipe } from '@angular/common';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-products',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {
  private productService = inject(ProductService);

  products = signal<Product[]>([]);
  importingProducts = signal<boolean>(false);

  constructor() {
    this.loadProducts();
  }

  private loadProducts() {
    this.productService.getAll().subscribe({
      next: (value) => this.products.set(value),
    });
  }

  private getSelectedProductIds(): string[] {
    const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
    const selectedIds: string[] = [];
    const products = this.products();

    checkboxes.forEach((checkbox, index) => {
      if ((checkbox as HTMLInputElement).checked && products[index]) {
        selectedIds.push(products[index]._id);
      }
    });

    return selectedIds;
  }

  deleteProduct(id: string) {
    this.productService.delete(id).subscribe({
      next: () => this.loadProducts(),
    });
  }

  deleteSelectedProducts(): void {
    const selectedIds = this.getSelectedProductIds();

    if (selectedIds.length === 0) {
      alert('Selecciona al menos un producto para eliminar.');
      return;
    }

    const confirmDelete = confirm(
      `¿Estás seguro de que deseas eliminar ${selectedIds.length} producto(s)?`,
    );
    if (!confirmDelete) {
      return;
    }

    forkJoin(selectedIds.map((id) => this.productService.delete(id))).subscribe({
      next: () => {
        this.loadProducts();
        alert(`${selectedIds.length} producto(s) eliminado(s) correctamente.`);

        const chk_main = document.getElementById('chk_main') as HTMLInputElement;
        if (chk_main) {
          chk_main.checked = false;
        }
      },
      error: () => {
        alert('Error al eliminar los productos seleccionados.');
      },
    });
  }

  markAllAsChecked(event: any) {
    const chk_main = document.getElementById('chk_main') as HTMLInputElement;
    const markAll = chk_main.checked;

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach((chk) => {
      const checkbox = chk as HTMLInputElement;

      if (markAll) {
        checkbox.checked = true;
      } else {
        checkbox.checked = false;
      }
    });
  }

  exportSelectedProductsToJson(): void {
    const selectedIds = this.getSelectedProductIds();
    const products = this.products();

    if (selectedIds.length === 0) {
      alert('Selecciona al menos un producto para exportar.');
      return;
    }

    const selectedProducts = products.filter((product) => selectedIds.includes(product._id));

    const exportableProducts = selectedProducts.map((product) => {
      const { _id, ...rest } = product;
      return rest;
    });

    const content = JSON.stringify(exportableProducts, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `products-export-${date}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  exportAllProductsToJson(): void {
    const products = this.products();

    if (!Array.isArray(products) || products.length === 0) {
      alert('No hay productos para exportar.');
      return;
    }

    const exportableProducts = products.map((product) => {
      const { _id, ...rest } = product;
      return rest;
    });

    const content = JSON.stringify(exportableProducts, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `products-export-${date}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  triggerImport(input: HTMLInputElement): void {
    input.click();
  }

  onImportProductsJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      alert('Selecciona un archivo .json válido.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));

        if (!Array.isArray(parsed)) {
          alert('El JSON debe contener un array de productos.');
          input.value = '';
          return;
        }

        const productsToImport = parsed
          .map((item) => {
            if (!item || typeof item !== 'object') {
              return null;
            }

            const { _id, ...rest } = item as Record<string, unknown>;
            return rest;
          })
          .filter(Boolean);

        if (productsToImport.length === 0) {
          alert('El archivo no contiene productos válidos para importar.');
          input.value = '';
          return;
        }

        this.importingProducts.set(true);

        forkJoin(productsToImport.map((product) => this.productService.create(product))).subscribe({
          next: () => {
            this.importingProducts.set(false);
            this.loadProducts();
            alert(`Importación completada: ${productsToImport.length} productos.`);
            input.value = '';
          },
          error: () => {
            this.importingProducts.set(false);
            alert('Error al importar productos desde el archivo JSON.');
            input.value = '';
          },
        });
      } catch {
        alert('El archivo JSON no tiene un formato válido.');
        input.value = '';
      }
    };

    reader.readAsText(file);
  }
}
