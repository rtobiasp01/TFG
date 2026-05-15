import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../../services/cart-service';
import { AuthService } from '../../../services/auth-service';
import { SiteSettingsService } from '../../../services/site-settings-service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly siteSettingsService = inject(SiteSettingsService);

  readonly cart = this.cartService.cart;
  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly siteName = this.siteSettingsService.siteName;
  readonly siteIcon = this.siteSettingsService.siteIcon;
  readonly isAdmin = this.authService.isAdmin;
  readonly showUserMenu = signal(false);
  readonly searchQuery = signal('');
  readonly searchExpanded = signal(false);

  cartItemCount(): number {
    return this.cart().items.length;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrapper')) {
      this.closeUserMenu();
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu.update((value) => !value);
  }

  closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.closeUserMenu();
    this.router.navigate(['/inicio']);
  }

  searchProducts(): void {
    const query = this.searchQuery().trim();
    if (query) {
      this.router.navigate(['/productos'], { queryParams: { search: query } });
      this.searchQuery.set('');
      this.closeSearchBar();
    }
  }

  onSearchKeypress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.searchProducts();
    }
  }

  toggleSearchBar(): void {
    if (this.searchExpanded() && this.searchQuery().trim()) {
      this.searchProducts();
    } else {
      this.searchExpanded.update((value) => !value);
    }
  }

  closeSearchBar(): void {
    this.searchExpanded.set(false);
  }
}
