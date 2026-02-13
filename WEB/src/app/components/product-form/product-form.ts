import { Component, inject } from '@angular/core';
import { ProductService } from '../../services/product-service';
import { Product } from '../../interfaces/product';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { ToggleSwitch } from '../../customized-components/toggle-switch/toggle-switch';

@Component({
  selector: 'app-product-form',
  imports: [AsyncPipe, ToggleSwitch],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);

  product$: Observable<Product> | undefined;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.product$ = this.productService.getById(id);
    }
  }
}
