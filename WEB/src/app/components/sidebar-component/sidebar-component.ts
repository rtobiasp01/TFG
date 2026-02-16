import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar-component.html',
  styleUrls: ['./sidebar-component.css'],
})
export class SidebarComponent {
  // Usamos signal para el estado reactivo
  isCollapsed = signal(false);

  // Datos del menú (podrías traerlos de un servicio o input)
  menuItems = [
    { icon: '🏠', label: 'Inicio', route: '/home' },
    { icon: '📊', label: 'Dashboard', route: '/dashboard' },
    { icon: '⚙️', label: 'Ajustes', route: '/settings' },
    { icon: '👤', label: 'Perfil', route: '/profile' },
  ];

  toggleSidebar() {
    this.isCollapsed.update((value) => !value);
  }
}
