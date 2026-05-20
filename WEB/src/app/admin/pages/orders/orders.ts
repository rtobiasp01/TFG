import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../services/order-service';
import { Order, OrderStatus, OrderItem } from '../../../interfaces/order';
import { FormsModule } from '@angular/forms';
import { ActionMenu, ActionMenuItem } from '../../components/action-menu/action-menu';

const API_BASE_URL = 'http://localhost:3000';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionMenu],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class AdminOrders {
  private orderService = inject(OrderService);

  orders = signal<Order[]>([]);
  loadingOrders = signal<boolean>(true);
  selectedOrder = signal<Order | null>(null);
  statusFilter = signal<string>('');

  readonly statusOptions: OrderStatus[] = [
    'pendiente',
    'confirmado',
    'enviado',
    'entregado',
    'cancelado',
  ];
  readonly statusLabels = {
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  };
  readonly statusColors = {
    pendiente: '#f59e0b',
    confirmado: '#3b82f6',
    enviado: '#8b5cf6',
    entregado: '#10b981',
    cancelado: '#ef4444',
  };

  private readonly currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

  constructor() {
    this.loadOrders();
  }

  private loadOrders() {
    this.loadingOrders.set(true);
    this.orderService.getAllOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loadingOrders.set(false);
      },
      error: () => {
        this.orders.set([]);
        this.loadingOrders.set(false);
      },
    });
  }

  getFilteredOrders(): Order[] {
    const filter = this.statusFilter();
    if (!filter) return this.orders();
    return this.orders().filter((order) => order.status === filter);
  }

  selectOrder(order: Order) {
    this.selectedOrder.set(this.selectedOrder() === order ? null : order);
  }

  updateOrderStatus(order: Order, newStatus: OrderStatus) {
    this.orderService.updateOrderStatus(order._id, newStatus).subscribe({
      next: () => {
        this.loadOrders();
        this.selectedOrder.set(null);
      },
      error: () => {
        alert('Error al actualizar el estado del pedido');
      },
    });
  }

  deleteOrder(orderId: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este pedido?')) {
      this.orderService.deleteOrder(orderId).subscribe({
        next: () => {
          this.loadOrders();
          this.selectedOrder.set(null);
        },
        error: () => {
          alert('Error al eliminar el pedido');
        },
      });
    }
  }

  getStatusColor(status: OrderStatus): string {
    return this.statusColors[status] || '#6b7280';
  }

  getStatusLabel(status: OrderStatus): string {
    return this.statusLabels[status] || status;
  }

  formatDate(date: any): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  getOrderTotal(order: Order): string {
    return this.formatPrice(order.total);
  }

  getItemPrice(item: OrderItem): string {
    const price = Number(item.price);
    const basePrice = Number(item.basePrice) || 0;
    const variantAdditionalPrice = Number(item.variantAdditionalPrice) || 0;
    const fallbackPrice = basePrice + variantAdditionalPrice;

    if (price === 0 && fallbackPrice > 0) {
      return this.formatPrice(fallbackPrice);
    }

    return this.formatPrice(Number.isFinite(price) ? price : fallbackPrice);
  }

  getItemsCount(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  hasCustomText(item: OrderItem): boolean {
    return !!item.customization?.customText?.trim();
  }

  getCustomText(item: OrderItem): string {
    return item.customization?.customText?.trim() || '';
  }

  hasCustomImage(item: OrderItem): boolean {
    return Boolean(item.customization?.uploadedImageUrl?.trim());
  }

  getCustomImageUrl(item: OrderItem): string {
    const rawImageUrl = item.customization?.uploadedImageUrl?.trim() || '';

    if (!rawImageUrl) {
      return '';
    }

    if (/^https?:\/\//i.test(rawImageUrl)) {
      return rawImageUrl;
    }

    const sanitizedPath = rawImageUrl.replace(/^\/+/, '');
    return `${API_BASE_URL}/${sanitizedPath}`;
  }

  getCustomImageDownloadName(item: OrderItem): string {
    const rawImageUrl = item.customization?.uploadedImageUrl?.trim() || '';
    const fileName = rawImageUrl.split('/').pop();
    return fileName || `personalizacion-${item.product_id}.png`;
  }

  getOrderViewAction(order: Order): () => void {
    return () => this.selectOrder(order);
  }

  getOrderActions(order: Order): ActionMenuItem[] {
    return [
      { label: 'Eliminar', danger: true, action: () => this.deleteOrder(order._id) },
    ];
  }

  getItemVariantLabel(item: OrderItem): string {
    const selection = item.selection || (item as any).variantAttributes || {};
    const entries = Object.entries(selection).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    );

    if (entries.length === 0) {
      return item.variantSku || 'N/A';
    }

    return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
  }
}
