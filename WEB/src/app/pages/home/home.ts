import { Component, inject } from '@angular/core';
import { ProductService } from '../../services/product-service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private productService = inject(ProductService);

  products$ = this.productService.getAll();
}
