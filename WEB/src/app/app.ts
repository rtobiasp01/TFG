import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteSettingsService } from './services/site-settings-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  private readonly siteSettingsService = inject(SiteSettingsService);

  // Keeps site settings service instantiated from app startup.
  protected readonly _siteSettings = this.siteSettingsService;
}
