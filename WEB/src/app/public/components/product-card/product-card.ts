import { Component, Input } from '@angular/core';
import { Product } from '../../../interfaces/product';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  @Input() productoActual!: Product;
  @Input() queryParams: Record<string, string> = {};

  private readonly locale = navigator.language || 'es-ES';
  private readonly currencyCode = this.detectCurrencyCode(this.locale);

  formatPrice(price: number): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: this.currencyCode,
      maximumFractionDigits: 2,
    }).format(Number(price) || 0);
  }

  private detectCurrencyCode(locale: string): string {
    const region = this.extractRegionFromLocale(locale);

    const regionToCurrency: Record<string, string> = {
      ES: 'EUR',
      FR: 'EUR',
      DE: 'EUR',
      IT: 'EUR',
      PT: 'EUR',
      NL: 'EUR',
      BE: 'EUR',
      IE: 'EUR',
      AT: 'EUR',
      GR: 'EUR',
      FI: 'EUR',
      US: 'USD',
      GB: 'GBP',
      CA: 'CAD',
      AU: 'AUD',
      NZ: 'NZD',
      MX: 'MXN',
      AR: 'ARS',
      CL: 'CLP',
      CO: 'COP',
      PE: 'PEN',
      BR: 'BRL',
      JP: 'JPY',
      KR: 'KRW',
      CN: 'CNY',
      CH: 'CHF',
      SE: 'SEK',
      NO: 'NOK',
      DK: 'DKK',
      PL: 'PLN',
      CZ: 'CZK',
      HU: 'HUF',
      RO: 'RON',
    };

    return region ? (regionToCurrency[region] ?? 'EUR') : 'EUR';
  }

  private extractRegionFromLocale(locale: string): string | null {
    const parts = locale.split('-');
    if (parts.length < 2) {
      return null;
    }

    const region = parts[1].toUpperCase();
    return region.length === 2 ? region : null;
  }
}
