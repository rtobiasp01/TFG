import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SiteSettingsService } from '../../../services/site-settings-service';

interface FooterLink {
  label: string;
  route: string;
  fragment?: string;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  private readonly siteSettingsService = inject(SiteSettingsService);

  readonly siteName = this.siteSettingsService.siteName;
  readonly siteIcon = this.siteSettingsService.siteIcon;

  footerLinks: FooterLink[] = [
    { label: 'Catálogo', route: '/productos' },
    { label: 'Personaliza', route: '/inicio', fragment: 'customize' },
    { label: 'Proceso', route: '/inicio', fragment: 'process' },
    { label: 'Contacto', route: '/contacto' },
  ];

  legalLinks: FooterLink[] = [
    { label: 'Aviso Legal', route: '/aviso-legal' },
    { label: 'Privacidad', route: '/privacidad' },
    { label: 'Cookies', route: '/politica-cookies' },
    { label: 'Condiciones', route: '/condiciones' },
    { label: 'Desistimiento', route: '/formulario-desistimiento' },
  ];

  currentYear = new Date().getFullYear();
}
