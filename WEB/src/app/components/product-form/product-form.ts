import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../services/product-service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm implements OnInit {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  // Signal para controlar si estamos en modo edición o creación
  productId = signal<string | null>(null);

  // Definición del formulario con sus validaciones
  productForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    short_description: [''],
    type: ['simple'],
    custom_slug: [''],
    price: [0, Validators.required],
    sku: [''],
    stock_status: ['in_stock'],
    stock_quantity: [0],
    manage_stock: [false],
    dim_l: [0],
    dim_w: [0],
    dim_h: [0],
    weight: [0],
    isVisible: [true],
    image: [null], // El input file se gestiona diferente
  });

  // Variable auxiliar para mostrar la vista previa (opcional)
  selectedFile: File | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.productId.set(id);
      // Simulación de llamada a la API
      this.productService.getById(id).subscribe((product) => {
        if (product) {
          // LA CLAVE: patchValue autorrellena el formulario con las claves que coincidan
          this.productForm.patchValue(product as any);
        }
      });
    }
  }

  // Método general que se dispara al enviar el formulario
  onSubmit(): void {
    if (this.productForm.invalid) {
      alert('Por favor rellena los campos obligatorios');
      return;
    }

    const formData = this.productForm.getRawValue();

    const payload = {
      ...formData,
    };

    if (this.productId()) {
      this.actualizar(payload);
    } else {
      this.guardar(payload);
    }
  }

  // Método para crear
  guardar(data: any): void {
    alert(`CREANDO PRODUCTO NUEVO:\n\n${JSON.stringify(data, null, 2)}`);
  }

  actualizar(data: any): void {
    alert(
      `ACTUALIZANDO PRODUCTO EXISTENTE (ID: ${this.productId()}):\n\n${JSON.stringify(data, null, 2)}`,
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile = file;
    }
  }
}
