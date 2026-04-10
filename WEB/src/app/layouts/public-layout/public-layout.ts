import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../../public/components/navbar/navbar';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, Navbar],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
})
export class PublicLayout {}