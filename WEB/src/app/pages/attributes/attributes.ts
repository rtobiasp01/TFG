import { Component, inject } from '@angular/core';
import { AttributeService } from '../../services/attribute-service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-attributes',
  imports: [],
  templateUrl: './attributes.html',
  styleUrl: './attributes.css',
})
export class Attributes {
  private attributeService = inject(AttributeService);

  attributes = toSignal(this.attributeService.getAll(), { initialValue: [] });
}
