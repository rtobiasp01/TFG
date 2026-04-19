import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../../services/cart-service';
import { AuthService } from '../../../services/auth-service';
import { SiteSettingsService } from '../../../services/site-settings-service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
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
  readonly isAdmin = this.authService.isAdmin;

  cartItemCount(): number {
    return this.cart().items.length;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/inicio']);
  }
}
