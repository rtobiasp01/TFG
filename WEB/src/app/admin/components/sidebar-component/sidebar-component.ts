import { Component, HostListener, inject, signal } from '@angular/core';
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
  mobileOpen = signal(false);
  readonly siteName = this.siteSettingsService.siteName;

  openMenus = signal<Set<string>>(new Set());

  menuItems: MenuItem[] = [
    { icon: '/home-icon-illustration-image-vector-removebg-preview.png', label: 'Home', route: '/admin/home' },
    { icon: '/home-icon-illustration-image-vector-removebg-preview.png', label: 'Inicio publica', route: '/inicio' },
    { icon: '/icon-gallery.png', label: 'Media', route: '/admin/media' },
    {
      icon: '/icon-graphic.png',
      label: 'Productos',
      children: [
        { icon: '/icon-box.png', label: 'Inventario', route: '/admin/products' },
        { icon: '/icon-puzzle.png', label: 'Variantes', route: '/admin/products/variants' },
        { icon: '/icon-tag.png', label: 'Categorías', route: '/admin/products/categories' },
      ],
    },
    { icon: '/icon-box.png', label: 'Pedidos', route: '/admin/pedidos' },
    { icon: '/star-icon-balanced-star-drawing-award-icon-on-white-background-free-vector.png', label: 'Reseñas', route: '/admin/resenas' },
    { icon: '/icon-ticket.png', label: 'Cupones', route: '/admin/cupones' },
    { icon: '/settings-icon-symbol-design-illustration-vector.png', label: 'Ajustes', route: '/admin/settings' },
  ];

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMobile();
  }

  toggleSidebar() {
    this.isCollapsed.update((v) => !v);
    if (this.isCollapsed()) this.openMenus.set(new Set());
  }

  toggleSubmenu(label: string) {
    if (this.isCollapsed()) return;

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

  openMobile() {
    this.mobileOpen.set(true);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }

  toggleMobile() {
    this.mobileOpen.update((v) => !v);
  }
}
