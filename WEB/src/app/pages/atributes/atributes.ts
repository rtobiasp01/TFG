import { Component, inject } from '@angular/core';
import { AtributeService } from '../../services/atribute-service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-atributes',
  imports: [],
  templateUrl: './atributes.html',
  styleUrl: './atributes.css',
})
export class Atributes {
  private atributeService = inject(AtributeService);

  atributes = toSignal(this.atributeService.getAll(), { initialValue: [] });
}
