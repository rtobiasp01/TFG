import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SiteSettingsService } from '../../../services/site-settings-service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly siteSettingsService = inject(SiteSettingsService);

  readonly siteName = signal<string>(this.siteSettingsService.siteName());
  readonly siteIcon = signal<string>(this.siteSettingsService.siteIcon());
  readonly saveMessage = signal<string>('');

  onSiteNameInput(event: Event): void {
    this.siteName.set((event.target as HTMLInputElement).value);
  }

  onIconUrlInput(event: Event): void {
    this.siteIcon.set((event.target as HTMLInputElement).value.trim());
  }

  onIconFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      this.siteIcon.set(String(reader.result || '').trim());
    };

    reader.readAsDataURL(file);
  }

  save(): void {
    this.siteSettingsService.updateSettings({
      siteName: this.siteName(),
      siteIcon: this.siteIcon(),
    });

    this.siteName.set(this.siteSettingsService.siteName());
    this.siteIcon.set(this.siteSettingsService.siteIcon());
    this.saveMessage.set('Ajustes guardados correctamente.');

    window.setTimeout(() => {
      this.saveMessage.set('');
    }, 1800);
  }
}
