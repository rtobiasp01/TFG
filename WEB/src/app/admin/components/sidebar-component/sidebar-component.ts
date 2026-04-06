import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
  isCollapsed = signal(false);

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
    { icon: '⚙️', label: 'Ajustes', route: '/admin/settings' },
    {
      icon: '👤',
      label: 'Perfil',
      children: [
        { icon: '📝', label: 'Mis datos', route: '/admin/profile/edit' },
        { icon: '🔒', label: 'Seguridad', route: '/admin/profile/security' },
      ],
    },
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
