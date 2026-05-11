import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SiteSettingsService } from '../../../services/site-settings-service';

interface MenuItem {
  icon: string;
  label: string;
  route?: string;
  children?: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar-component.html',
  styleUrls: ['./sidebar-component.css'],
})
export class SidebarComponent {
  private readonly siteSettingsService = inject(SiteSettingsService);

  isCollapsed = signal(false);
  readonly siteName = this.siteSettingsService.siteName;

  // Guardamos los labels de los menús abiertos
  openMenus = signal<Set<string>>(new Set());

  menuItems: MenuItem[] = [
    { icon: '🏠', label: 'Home', route: '/admin/home' },
    { icon: '🏠', label: 'Inicio publica', route: '/inicio' },
    { icon: '🖼️', label: 'Media', route: '/admin/media' },
    {
      icon: '📊',
      label: 'Productos',
      children: [
        { icon: '📦', label: 'Inventario', route: '/admin/products' },
        { icon: '🧩', label: 'Variantes', route: '/admin/products/variants' },
        { icon: '🏷️', label: 'Categorías', route: '/admin/products/categories' },
      ],
    },
    { icon: '📦', label: 'Pedidos', route: '/admin/pedidos' },
    { icon: '⭐', label: 'Reseñas', route: '/admin/resenas' },
    { icon: '🎟️', label: 'Cupones', route: '/admin/cupones' },
    { icon: '⚙️', label: 'Ajustes', route: '/admin/settings' },
  ];

  toggleSidebar() {
    this.isCollapsed.update((v) => !v);
    if (this.isCollapsed()) this.openMenus.set(new Set()); // Cerramos submenús al colapsar
  }

  toggleSubmenu(label: string) {
    if (this.isCollapsed()) return; // No abrir si está colapsado

    this.openMenus.update((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  isMenuOpen(label: string): boolean {
    return this.openMenus().has(label);
  }
}
