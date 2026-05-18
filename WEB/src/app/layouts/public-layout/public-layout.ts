import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../../public/components/navbar/navbar';
import { Footer } from '../../public/components/footer/footer';
import { CookieBanner } from '../../public/components/cookie-banner/cookie-banner';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer, CookieBanner],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
})
export class PublicLayout {}
