import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, signal, ViewChild, AfterViewInit, OnDestroy, NgZone } from '@angular/core';

export interface ActionMenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
}

@Component({
  selector: 'app-action-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './action-menu.html',
  styleUrl: './action-menu.css',
})
export class ActionMenu implements AfterViewInit, OnDestroy {
  @Input({ required: true }) primaryLabel = 'Acción';
  @Input({ required: true }) primaryAction!: () => void;
  @Input({ required: true }) items: ActionMenuItem[] = [];

  readonly isOpen = signal<boolean>(false);
  readonly dropdownPosition = signal<{ top: number; right: number } | null>(null);
  @ViewChild('menuRef') menuRef?: ElementRef<HTMLDivElement>;
  @ViewChild('toggleRef') toggleRef?: ElementRef<HTMLButtonElement>;

  private scrollHandler = () => {
    if (this.isOpen()) {
      this.close();
    }
  };

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('scroll', this.scrollHandler, true);
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.scrollHandler, true);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.toggleRef) {
      const rect = this.toggleRef.nativeElement.getBoundingClientRect();
      const dropdownMinWidth = 140;
      const viewportWidth = window.innerWidth;

      let right = viewportWidth - rect.right;

      if (right < 0) {
        right = 0;
      }

      if (right + dropdownMinWidth > viewportWidth) {
        right = Math.max(0, viewportWidth - dropdownMinWidth);
      }

      this.dropdownPosition.set({
        top: rect.bottom + 4,
        right,
      });
    }
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.dropdownPosition.set(null);
  }

  onPrimaryClick(): void {
    this.close();
    this.primaryAction();
  }

  executeAction(fn: () => void): void {
    this.close();
    fn();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (this.isOpen() && this.menuRef && !this.menuRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
