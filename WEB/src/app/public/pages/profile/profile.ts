import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth-service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly loadingProfile = signal(true);
  readonly savingProfile = signal(false);
  readonly loadError = signal('');
  readonly submitError = signal('');
  readonly submitSuccess = signal('');

  readonly profileForm = this.formBuilder.nonNullable.group({
    personalData: this.formBuilder.nonNullable.group({
      firstName: ['', [Validators.minLength(2), Validators.pattern(/^[A-Za-zÀ-ÿ' -]{2,60}$/)]],
      lastName: ['', [Validators.minLength(2), Validators.pattern(/^[A-Za-zÀ-ÿ' -]{2,60}$/)]],
      email: ['', [Validators.email]],
      phone: ['', [Validators.pattern(/^\+?[0-9]{9,15}$/)]],
      documentId: ['', [Validators.pattern(/^([XYZxyz]\d{7}[A-Za-z]|\d{8}[A-Za-z])$/)]],
    }),
    shippingAddress: this.formBuilder.nonNullable.group({
      street: ['', [Validators.minLength(5)]],
      city: ['', [Validators.minLength(2)]],
      zipCode: ['', [Validators.pattern(/^\d{5}$/)]],
      country: ['', [Validators.minLength(2)]],
    }),
  });

  ngOnInit(): void {
    this.loadingProfile.set(true);
    this.loadError.set('');

    this.authService.fetchMe().subscribe({
      next: (response) => {
        this.profileForm.patchValue({
          personalData: {
            firstName: response.user.personalData?.firstName || '',
            lastName: response.user.personalData?.lastName || '',
            email: response.user.personalData?.email || response.user.email || '',
            phone: response.user.personalData?.phone || '',
            documentId: response.user.personalData?.documentId || '',
          },
          shippingAddress: {
            street: response.user.shippingAddress?.street || '',
            city: response.user.shippingAddress?.city || '',
            zipCode: response.user.shippingAddress?.zipCode || '',
            country: response.user.shippingAddress?.country || '',
          },
        });

        this.loadingProfile.set(false);
      },
      error: () => {
        this.loadError.set('No se pudieron cargar tus datos de perfil.');
        this.loadingProfile.set(false);
      },
    });
  }

  controlHasError(path: string): boolean {
    const control = this.getControl(path);
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  controlErrorMessage(path: string): string {
    const control = this.getControl(path);

    if (!control || !control.errors) {
      return '';
    }

    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres.`;
    }

    if (control.errors['email']) {
      return 'Introduce un correo electronico valido.';
    }

    if (control.errors['pattern']) {
      if (path === 'personalData.firstName' || path === 'personalData.lastName') {
        return 'Solo se permiten letras, espacios, apostrofes y guiones.';
      }

      if (path === 'personalData.phone') {
        return 'Introduce un telefono valido (9 a 15 digitos).';
      }

      if (path === 'personalData.documentId') {
        return 'Introduce un DNI o NIE valido (ejemplo: 12345678Z).';
      }

      if (path === 'shippingAddress.zipCode') {
        return 'Introduce un codigo postal valido de 5 digitos.';
      }
    }

    return 'Valor no valido.';
  }

  saveProfile(): void {
    this.submitError.set('');
    this.submitSuccess.set('');

    if (this.savingProfile()) {
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.submitError.set('Revisa los campos antes de guardar.');
      return;
    }

    this.savingProfile.set(true);

    const personalData = this.profileForm.controls.personalData.getRawValue();
    const shippingAddress = this.profileForm.controls.shippingAddress.getRawValue();

    this.authService.updateProfileData({ personalData, shippingAddress }).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.submitSuccess.set(
          'Perfil actualizado. Estos datos se usaran para autocompletar checkout.',
        );
      },
      error: () => {
        this.savingProfile.set(false);
        this.submitError.set('No se pudo guardar el perfil. Intentalo de nuevo.');
      },
    });
  }

  private getControl(path: string): AbstractControl | null {
    return this.profileForm.get(path);
  }
}
