import { DOCUMENT } from '@angular/common';
import { effect, Inject, Injectable, signal } from '@angular/core';

interface SiteSettingsState {
  siteName: string;
  siteIcon: string;
}

const DEFAULT_SITE_SETTINGS: SiteSettingsState = {
  siteName: 'Animales',
  siteIcon: '/favicon.ico',
};

@Injectable({
  providedIn: 'root',
})
export class SiteSettingsService {
  private readonly STORAGE_KEY = 'tfg_site_settings';

  readonly siteName = signal<string>(DEFAULT_SITE_SETTINGS.siteName);
  readonly siteIcon = signal<string>(DEFAULT_SITE_SETTINGS.siteIcon);

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    this.restoreSettings();

    effect(() => {
      this.applyToDocument(this.siteName(), this.siteIcon());
    });
  }

  updateSettings(settings: Partial<SiteSettingsState>): void {
    if (settings.siteName !== undefined) {
      this.siteName.set(this.normalizeName(settings.siteName));
    }

    if (settings.siteIcon !== undefined) {
      this.siteIcon.set(this.normalizeIcon(settings.siteIcon));
    }

    this.persistSettings();
  }

  private normalizeName(rawName: string): string {
    const normalized = String(rawName ?? '').trim();
    return normalized.length > 0 ? normalized : DEFAULT_SITE_SETTINGS.siteName;
  }

  private normalizeIcon(rawIcon: string): string {
    const normalized = String(rawIcon ?? '').trim();
    return normalized.length > 0 ? normalized : DEFAULT_SITE_SETTINGS.siteIcon;
  }

  private restoreSettings(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Partial<SiteSettingsState>;

      this.siteName.set(this.normalizeName(parsed.siteName ?? DEFAULT_SITE_SETTINGS.siteName));
      this.siteIcon.set(this.normalizeIcon(parsed.siteIcon ?? DEFAULT_SITE_SETTINGS.siteIcon));
    } catch (error) {
      console.error('Error restoring site settings:', error);
    }
  }

  private persistSettings(): void {
    try {
      const payload: SiteSettingsState = {
        siteName: this.siteName(),
        siteIcon: this.siteIcon(),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('Error saving site settings:', error);
    }
  }

  private applyToDocument(siteName: string, siteIcon: string): void {
    this.document.title = siteName;

    let favicon = this.document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;

    if (!favicon) {
      favicon = this.document.createElement('link');
      favicon.rel = 'icon';
      this.document.head.appendChild(favicon);
    }

    favicon.href = siteIcon;
  }
}
