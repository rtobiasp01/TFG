import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Category } from '../../../interfaces/category';
import { Order, OrderStatus } from '../../../interfaces/order';
import { Product } from '../../../interfaces/product';
import { CategoryService } from '../../../services/category-service';
import { OrderService } from '../../../services/order-service';
import { ProductService } from '../../../services/product-service';

interface DashboardBar {
  label: string;
  value: number;
  percentage: number;
}

interface MonthlyPoint {
  label: string;
  orders: number;
  revenue: number;
}

interface KpiCard {
  label: string;
  value: string;
  hint: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly categoryService = inject(CategoryService);

  products = signal<Product[]>([]);
  orders = signal<Order[]>([]);
  categories = signal<Category[]>([]);

  loading = signal<boolean>(true);
  loadError = signal<string>('');
  lastUpdated = signal<Date | null>(null);

  private readonly statusLabels: Record<OrderStatus, string> = {
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  };

  private readonly currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });

  constructor() {
    this.loadDashboardData();
  }

  private loadDashboardData() {
    this.loading.set(true);
    this.loadError.set('');

    forkJoin({
      products: this.productService.getAll(),
      orders: this.orderService.getAllOrders(),
      categories: this.categoryService.getAll(),
    }).subscribe({
      next: ({ products, orders, categories }) => {
        this.products.set(products ?? []);
        this.orders.set(orders ?? []);
        this.categories.set(categories ?? []);
        this.lastUpdated.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.orders.set([]);
        this.categories.set([]);
        this.loadError.set('No se pudo cargar el dashboard. Intenta recargar.');
        this.loading.set(false);
      },
    });
  }

  refresh() {
    this.loadDashboardData();
  }

  kpis = computed<KpiCard[]>(() => {
    const orders = this.orders();
    const products = this.products();
    const categories = this.categories();

    const validOrders = orders.filter((order) => order.status !== 'cancelado');
    const totalRevenue = validOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const averageTicket = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;
    const pendingOrders = orders.filter((order) => order.status === 'pendiente').length;
    const lowStockCount = this.lowStockProducts().length;

    return [
      {
        label: 'Ingresos estimados',
        value: this.formatCurrency(totalRevenue),
        hint: `${validOrders.length} pedidos no cancelados`,
      },
      {
        label: 'Pedidos pendientes',
        value: String(pendingOrders),
        hint: `de ${orders.length} pedidos totales`,
      },
      {
        label: 'Ticket medio',
        value: this.formatCurrency(averageTicket),
        hint: 'media por pedido válido',
      },
      {
        label: 'Productos publicados',
        value: String(products.length),
        hint: `${lowStockCount} con stock bajo`,
      },
      {
        label: 'Unidades en stock',
        value: String(this.getTotalStock(products)),
        hint: 'suma de inventario actual',
      },
      {
        label: 'Categorías',
        value: String(categories.length),
        hint: 'clasificación del catálogo',
      },
    ];
  });

  orderStatusBars = computed<DashboardBar[]>(() => {
    const orders = this.orders();
    const total = orders.length;

    const counts: Record<OrderStatus, number> = {
      pendiente: 0,
      confirmado: 0,
      enviado: 0,
      entregado: 0,
      cancelado: 0,
    };

    for (const order of orders) {
      counts[order.status] = (counts[order.status] || 0) + 1;
    }

    return (Object.keys(counts) as OrderStatus[])
      .map((status) => {
        const value = counts[status];
        const percentage = total > 0 ? (value / total) * 100 : 0;

        return {
          label: this.statusLabels[status],
          value,
          percentage,
        };
      })
      .sort((a, b) => b.value - a.value);
  });

  topCategoryBars = computed<DashboardBar[]>(() => {
    const counter = new Map<string, number>();

    for (const product of this.products()) {
      for (const categoryName of product.categoria ?? []) {
        counter.set(categoryName, (counter.get(categoryName) ?? 0) + 1);
      }
    }

    const entries = Array.from(counter.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const max = entries[0]?.value ?? 0;

    return entries.map((entry) => ({
      ...entry,
      percentage: max > 0 ? (entry.value / max) * 100 : 0,
    }));
  });

  monthlyTrend = computed<MonthlyPoint[]>(() => {
    const now = new Date();
    const months: MonthlyPoint[] = [];

    for (let index = 5; index >= 0; index -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
      months.push({
        label: monthDate.toLocaleDateString('es-ES', { month: 'short' }),
        orders: 0,
        revenue: 0,
      });
    }

    for (const order of this.orders()) {
      if (order.status === 'cancelado') {
        continue;
      }

      const createdAt = new Date(order.createdAt);
      const monthDiff =
        (now.getFullYear() - createdAt.getFullYear()) * 12 +
        (now.getMonth() - createdAt.getMonth());

      if (monthDiff < 0 || monthDiff > 5) {
        continue;
      }

      const target = months[5 - monthDiff];
      target.orders += 1;
      target.revenue += order.total || 0;
    }

    return months;
  });

  monthlyRevenueMax = computed<number>(() => {
    return this.monthlyTrend().reduce((max, point) => Math.max(max, point.revenue), 0);
  });

  lowStockProducts = computed<Product[]>(() => {
    return this.products()
      .filter((product) => product.stock_quantity <= 5)
      .sort((a, b) => a.stock_quantity - b.stock_quantity)
      .slice(0, 6);
  });

  recentOrders = computed<Order[]>(() => {
    return [...this.orders()]
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 6);
  });

  getMonthlyBarHeight(revenue: number): number {
    const max = this.monthlyRevenueMax();
    if (max <= 0) {
      return 0;
    }

    return (revenue / max) * 100;
  }

  formatCurrency(value: number): string {
    return this.currencyFormatter.format(value || 0);
  }

  formatDate(value: Date | string): string {
    const date = new Date(value);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getTotalStock(products: Product[]): number {
    return products.reduce((sum, product) => sum + (product.stock_quantity || 0), 0);
  }
}
