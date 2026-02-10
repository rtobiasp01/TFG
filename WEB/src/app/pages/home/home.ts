import { Component, inject, OnInit } from '@angular/core';
import { ProductService } from '../../services/product-service';
import { Observable } from 'rxjs';
import { Product } from '../../interfaces/product';
import { AsyncPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private productService = inject(ProductService);

  products: Product[] | undefined;

  constructor() {
    this.products = this.productService.getAll();
  }
}
