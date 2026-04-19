import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthUser } from '../interfaces/auth-user';

interface LoginResponse {
  token: string;
  user?: AuthUser;
}

interface RegisterResponse {
  message: string;
}

interface AuthProfileResponse {
  user: AuthUser;
}

interface JwtPayload {
  userId?: string;
  email?: string;
  isAdmin?: boolean;
  exp?: number;
}

const API_BASE_URL = 'http://localhost:3000/users';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly TOKEN_KEY = 'tfg_auth_token';
  private readonly USER_KEY = 'tfg_auth_user';

  readonly token = signal<string | null>(null);
  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => Boolean(this.getToken()));
  readonly isAdmin = computed(() => Boolean(this.currentUser()?.isAdmin));

  constructor() {
    this.restoreSession();
    // Avoid triggering HTTP interceptors while the service is still being constructed.
    queueMicrotask(() => this.syncUserFromServer());
  }

  register(email: string, password: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${API_BASE_URL}/register`, { email, password });
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/login`, { email, password }).pipe(
      tap((response) => {
        this.setSession(response.token, response.user);
      }),
    );
  }

  fetchMe(): Observable<AuthProfileResponse> {
    return this.http.get<AuthProfileResponse>(`${API_BASE_URL}/me`).pipe(
      tap((response) => {
        this.currentUser.set(response.user);
        this.persistUser(response.user);
      }),
    );
  }

  logout(): void {
    this.clearSession();
  }

  getToken(): string | null {
    const token = this.token();

    if (!token) {
      return null;
    }

    if (this.isTokenExpired(token)) {
      this.clearSession();
      return null;
    }

    return token;
  }

  defaultRouteForCurrentUser(): string {
    return this.isAdmin() ? '/admin/home' : '/inicio';
  }

  private setSession(token: string, user?: AuthUser): void {
    this.token.set(token);
    localStorage.setItem(this.TOKEN_KEY, token);

    if (user) {
      this.currentUser.set(user);
      this.persistUser(user);
      return;
    }

    const tokenUser = this.userFromToken(token);
    this.currentUser.set(tokenUser);

    if (tokenUser) {
      this.persistUser(tokenUser);
      return;
    }

    localStorage.removeItem(this.USER_KEY);
  }

  private persistUser(user: AuthUser): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private restoreSession(): void {
    const storedToken = localStorage.getItem(this.TOKEN_KEY);
    const storedUser = localStorage.getItem(this.USER_KEY);

    if (!storedToken || this.isTokenExpired(storedToken)) {
      this.clearSession();
      return;
    }

    this.token.set(storedToken);

    const tokenUser = this.userFromToken(storedToken);
    this.currentUser.set(tokenUser);

    if (storedUser) {
      try {
        if (!tokenUser) {
          this.currentUser.set(JSON.parse(storedUser) as AuthUser);
        }
        return;
      } catch {
        localStorage.removeItem(this.USER_KEY);
      }
    }
  }

  private syncUserFromServer(): void {
    if (!this.getToken()) {
      return;
    }

    this.fetchMe().subscribe({
      error: (error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          this.clearSession();
          return;
        }

        // Keep current session on transient backend/network errors.
        console.error('Error syncing authenticated user:', error);
      },
    });
  }

  private clearSession(): void {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);

    if (!payload?.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  }

  private userFromToken(token: string): AuthUser | null {
    const payload = this.decodeToken(token);

    if (!payload?.userId || !payload.email) {
      return null;
    }

    return {
      _id: String(payload.userId),
      email: payload.email,
      isAdmin: Boolean(payload.isAdmin),
    };
  }

  private decodeToken(token: string): JwtPayload | null {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length < 2) {
        return null;
      }

      const base64Url = tokenParts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const decoded = atob(normalized);

      return JSON.parse(decoded) as JwtPayload;
    } catch {
      return null;
    }
  }
}
