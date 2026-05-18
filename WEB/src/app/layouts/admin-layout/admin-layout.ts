import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../admin/components/sidebar-component/sidebar-component';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout implements OnInit, OnDestroy {
  @ViewChild(SidebarComponent) sidebar!: SidebarComponent;
  private routerSub?: Subscription;

  constructor(private router: Router) {}

  ngOnInit() {
    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.closeSidebar());
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  toggleSidebar() {
    this.sidebar?.toggleMobile();
  }

  closeSidebar() {
    this.sidebar?.closeMobile();
  }
}
