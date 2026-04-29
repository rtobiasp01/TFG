import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth-service';

function redirectToLogin(router: Router): UrlTree {
  return router.parseUrl('/login');
}

export const adminGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.getToken()) {
    return redirectToLogin(router);
  }

  if (!authService.isAdmin()) {
    return router.parseUrl('/inicio');
  }

  return true;
};

export const publicOnlyGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.getToken()) {
    return true;
  }

  return router.parseUrl(authService.defaultRouteForCurrentUser());
};

export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getToken()) {
    return true;
  }

  return redirectToLogin(router);
};
