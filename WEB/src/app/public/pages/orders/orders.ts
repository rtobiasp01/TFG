import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../services/order-service';
import { Order, OrderStatus, OrderItem } from '../../../interfaces/order';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  private orderService = inject(OrderService);

  orders = signal<Order[]>([]);
  loadingOrders = signal<boolean>(true);
  selectedOrder = signal<Order | null>(null);
  modalImageUrl = signal<string | null>(null);

  readonly statusColors = computed(() => ({
    pendiente: '#f59e0b',
    confirmado: '#3b82f6',
    enviado: '#8b5cf6',
    entregado: '#10b981',
    cancelado: '#ef4444',
  }));

  readonly statusLabels = computed(() => ({
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  }));

  private readonly currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

  constructor() {
    this.loadOrders();
  }

  cancelOrder(order: Order) {
    if (!order || !order._id) return;

    const ok = window.confirm('¿Deseas cancelar este pedido? Esta acción no se puede deshacer.');
    if (!ok) return;

    this.orderService.cancelOrder(order._id).subscribe({
      next: () => {
        this.loadOrders();
      },
      error: (err) => {
        console.error('Error cancelling order', err);
        alert('No se pudo cancelar el pedido.');
      },
    });
  }

  private loadOrders() {
    this.loadingOrders.set(true);
    this.orderService.getUserOrders().subscribe({
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

  selectOrder(order: Order) {
    this.selectedOrder.set(this.selectedOrder() === order ? null : order);
  }

  getStatusColor(status: OrderStatus): string {
    return this.statusColors()[status] || '#6b7280';
  }

  getStatusLabel(status: OrderStatus): string {
    return this.statusLabels()[status] || status;
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
    return this.formatPrice(item.price);
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
    return `http://localhost:3000/${sanitizedPath}`;
  }

  getCustomImageDownloadName(item: OrderItem): string {
    const rawImageUrl = item.customization?.uploadedImageUrl?.trim() || '';
    const fileName = rawImageUrl.split('/').pop();
    return fileName || `personalizacion-${item.product_id}.png`;
  }

  openImageModal(item: OrderItem) {
    this.modalImageUrl.set(this.getCustomImageUrl(item));
  }

  closeImageModal() {
    this.modalImageUrl.set(null);
  }
}
