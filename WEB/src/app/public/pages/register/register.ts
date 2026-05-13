import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth-service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.formBuilder.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  onSubmit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      if (this.form.errors?.['passwordsMismatch']) {
        this.errorMessage.set('Las contraseñas no coinciden.');
      }

      return;
    }

    const { email, password, confirmPassword } = this.form.getRawValue();

    if (password !== confirmPassword) {
      this.form.controls.confirmPassword.setErrors({ passwordsMismatch: true });
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.authService.register(email, password).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Cuenta creada correctamente.');
        this.form.reset();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error?.error?.error ?? 'No se pudo registrar la cuenta.');
      },
    });
  }
}
