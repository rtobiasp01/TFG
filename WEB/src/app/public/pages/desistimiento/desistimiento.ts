import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-desistimiento',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './desistimiento.html',
  styleUrl: './desistimiento.css',
})
export class Desistimiento {
  printForm(): void {
    window.print();
  }
}
