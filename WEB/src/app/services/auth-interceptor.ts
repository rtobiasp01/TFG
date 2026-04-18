import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth-service';

const API_BASE_URL = 'http://localhost:3000';
const AUTH_SELF_ENDPOINTS = ['/users/me', '/users/profile'];

function withAuthToken(request: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token || !request.url.startsWith(API_BASE_URL)) {
    return request;
  }

  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);
  const authRequest = withAuthToken(request, authService.getToken());

  return next(authRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      const isSelfAuthRequest = AUTH_SELF_ENDPOINTS.some((endpoint) =>
        authRequest.url.includes(endpoint),
      );

      // Only clear session on token validation calls; keep session for other unauthorized APIs.
      if (error.status === 401 && authService.isAuthenticated() && isSelfAuthRequest) {
        authService.logout();
      }

      return throwError(() => error);
    }),
  );
};
