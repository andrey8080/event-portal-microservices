import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    // styleUrls: ['./login.component.scss'],
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
    loginForm!: FormGroup;
    isSubmitting = false;
    errorMessage = '';
    returnUrl: string = '/';

    constructor(
        private formBuilder: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.initForm();

        // Получаем URL для возврата после успешного входа
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

        // Перенаправляем пользователя, если он уже авторизован
        if (this.authService.isAuthenticated()) {
            this.router.navigate([this.returnUrl]);
        }
    }

    initForm(): void {
        this.loginForm = this.formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });
    }

    onSubmit(): void {
        if (this.loginForm.invalid) {
            return;
        }

        this.isSubmitting = true;
        this.errorMessage = '';

        const { email, password } = this.loginForm.value;

        this.authService.login(email, password).subscribe({
            next: (user) => {
                console.log('Успешный вход:', user);
                this.isSubmitting = false;
                this.router.navigateByUrl(this.returnUrl);
            },
            error: (error) => {
                this.isSubmitting = false;

                // Обработка ошибки авторизации
                if (error.status === 401) {
                    this.errorMessage = 'Неверный email или пароль';
                } else if (error.error && error.error.error) {
                    this.errorMessage = error.error.error;
                } else {
                    this.errorMessage = 'Произошла ошибка при входе. Пожалуйста, попробуйте позже.';
                    console.error('Ошибка входа:', error);
                }
            }
        });
    }
}
