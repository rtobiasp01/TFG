import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../../interfaces/category';
import { Product } from '../../../interfaces/product';
import { CategoryService } from '../../../services/category-service';
import { ProductService } from '../../../services/product-service';
import { SiteSettingsService } from '../../../services/site-settings-service';
import { ProductCard } from '../../components/product-card/product-card';

interface LandingStat {
  value: string;
  label: string;
}

interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

interface Testimonial {
  initials: string;
  name: string;
  role: string;
  quote: string;
}

@Component({
  selector: 'app-home-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeLanding {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly siteSettingsService = inject(SiteSettingsService);

  readonly siteName = this.siteSettingsService.siteName;
  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly newsletterEmail = signal('');
  readonly newsletterMessage = signal('');

  readonly featuredProducts = computed(() => this.products().slice(0, 6));
  readonly heroProduct = computed(() => this.featuredProducts()[0] ?? null);
  readonly visibleCategories = computed(() =>
    this.categories()
      .filter((category) => category.visible !== false)
      .slice(0, 6),
  );
  readonly personalizedProductsCount = computed(
    () => this.products().filter((product) => product.type === 'custom-personalized').length,
  );
  readonly heroStats = computed<LandingStat[]>(() => [
    { value: `${this.products().length}`, label: 'productos en catálogo' },
    { value: `${this.visibleCategories().length}`, label: 'categorías activas' },
    { value: `${this.personalizedProductsCount()}`, label: 'modelos personalizables' },
  ]);

  readonly processSteps: ProcessStep[] = [
    {
      number: '01',
      title: 'Elige tu diseño',
      description: 'Explora piezas para hogar, eventos, señalética o regalos personalizados.',
    },
    {
      number: '02',
      title: 'Personaliza',
      description: 'Añade texto, combina materiales o adapta el acabado a tu idea.',
    },
    {
      number: '03',
      title: 'Grabado láser',
      description: 'Preparamos el pedido con el grabado y los acabados definidos en la ficha.',
    },
    {
      number: '04',
      title: 'Recíbelo en casa',
      description: 'Enviamos tu pedido listo para entregar, montar o regalar.',
    },
  ];

  readonly testimonials: Testimonial[] = [
    {
      initials: 'AM',
      name: 'Ana M.',
      role: 'Regalo personalizado',
      quote:
        'El resultado fue muy fino y el proceso de compra muy claro. La pieza llegó tal y como la habíamos imaginado.',
    },
    {
      initials: 'CR',
      name: 'Carlos R.',
      role: 'Decoración del hogar',
      quote:
        'Me gustó poder ver los productos y encontrar ideas por categoría. La calidad del grabado destaca muchísimo.',
    },
    {
      initials: 'LV',
      name: 'Laura V.',
      role: 'Evento especial',
      quote:
        'La personalización quedó perfecta para la ocasión y la atención al detalle se nota en cada acabado.',
    },
  ];

  constructor() {
    this.loadProducts();
    this.loadCategories();
  }

  submitNewsletter(event: Event): void {
    event.preventDefault();
    const email = this.newsletterEmail().trim();

    if (!email) {
      this.newsletterMessage.set('Introduce un email válido para suscribirte.');
      return;
    }

    this.newsletterMessage.set(
      'Gracias. Deja conectado este formulario con tu proveedor de email.',
    );
    this.newsletterEmail.set('');
  }

  private loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (products) => this.products.set(products ?? []),
      error: () => this.products.set([]),
    });
  }

  private loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (categories) => this.categories.set(categories ?? []),
      error: () => this.categories.set([]),
    });
  }
}
