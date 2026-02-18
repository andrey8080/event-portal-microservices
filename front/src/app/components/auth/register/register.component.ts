import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    // styleUrls: ['./register.component.scss'],
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule]
})
export class RegisterComponent implements OnInit {
    registerForm!: FormGroup;
    isSubmitting = false;
    errorMessage = '';
    successMessage = '';

    constructor(
        private formBuilder: FormBuilder,
        private router: Router,
        private authService: AuthService,
        private notificationService: NotificationService
    ) { }

    ngOnInit(): void {
        this.initForm();

        // Перенаправляем пользователя, если он уже авторизован
        if (this.authService.isAuthenticated()) {
            this.router.navigate(['/']);
        }
    }

    initForm(): void {
        this.registerForm = this.formBuilder.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required],
            phoneNumber: [''] // Дополнительное поле, необязательное
        }, {
            validators: this.passwordsMatchValidator
        });
    }

    passwordsMatchValidator(form: FormGroup) {
        const password = form.get('password')?.value;
        const confirmPassword = form.get('confirmPassword')?.value;
        return password === confirmPassword ? null : { passwordsNotMatch: true };
    }

    onSubmit(): void {
        if (this.registerForm.invalid) {
            return;
        }

        const { name, email, password, phoneNumber } = this.registerForm.value;

        this.authService.register(name!, email!, password!, phoneNumber).subscribe({
            next: (user) => {
                this.notificationService.success('Регистрация успешна!');
                this.router.navigate(['/login']);
            },
            error: (error) => {
                this.notificationService.errorFromHttp(error, 'Не удалось завершить регистрацию');
            }
        });
    }
}
