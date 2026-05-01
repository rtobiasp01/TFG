import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../../services/cart-service';
import { AuthService } from '../../../services/auth-service';
import { SiteSettingsService } from '../../../services/site-settings-service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
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

  cartItemCount(): number {
    return this.cart().items.length;
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
}
