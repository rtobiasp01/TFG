import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cookie-banner.html',
  styleUrl: './cookie-banner.css',
})
export class CookieBanner {
  readonly isVisible = signal(!this.hasConsent());

  acceptAll(): void {
    this.saveConsent('accepted');
    this.isVisible.set(false);
  }

  rejectNonEssential(): void {
    this.saveConsent('rejected');
    this.isVisible.set(false);
  }

  private hasConsent(): boolean {
    return typeof document !== 'undefined' && document.cookie.includes('cookie_consent=');
  }

  private saveConsent(value: string): void {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    document.cookie = `cookie_consent=${value}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
  }
}
