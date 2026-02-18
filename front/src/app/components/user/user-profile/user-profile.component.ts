import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User, UserRole } from '../../../models/user.model';
import { Event } from '../../../models/event.model';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { EventService } from '../../../services/event.service';
import { NotificationService } from '../../../services/notification.service';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
    selector: 'app-user-profile',
    templateUrl: './user-profile.component.html',
    styleUrls: ['./user-profile.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule]
})
export class UserProfileComponent implements OnInit {
    user: User | null = null;
    userEvents: Event[] = [];
    isLoading = true;
    isSubmitting = false;
    errorMessage = '';
    currentUserObj = JSON.parse(localStorage.current_user);
    role = this.currentUserObj.role
    qrCodeUrl: string | null = null;

    profileForm: FormGroup;
    passwordForm: FormGroup;

    constructor(
        private userService: UserService,
        private authService: AuthService,
        private eventService: EventService,
        private fb: FormBuilder,
        private notificationService: NotificationService,
        private router: Router
    ) {
        this.profileForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            phoneNumber: [''],
            // role: ['']  // Добавляем role в форму
        });

        this.passwordForm = this.fb.group({
            currentPassword: ['', Validators.required],
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required]
        });
    }

    ngOnInit(): void {
        this.loadUserProfile();
    }

    getUserTickets(): void {
        if (this.user?.id !== undefined) {
            this.userService.getUserTickets(this.user.id).subscribe({
                next: (events) => (this.userEvents = events),
                error: (err) => this.notificationService.errorFromHttp(err, 'Не удалось загрузить билеты')
            });
        } else {
            this.notificationService.error('Ошибка: пользователь не найден');
        }
    }


    updateQrCodeUrl(eventId: number, userEmail: string): void {
        this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=eventId=${eventId},email=${userEmail}`;
    }


    loadUserProfile(): void {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) {
            this.errorMessage = 'Пользователь не авторизован';
            this.isLoading = false;
            return;
        }

        this.userService.getUserProfile(currentUser.id).subscribe({
            next: (userData) => {
                this.user = userData;
                this.fillFormWithUserData(userData);  // Форма заполняется только после получения данных
                this.isLoading = false;
            },
            error: () => {
                this.errorMessage = 'Ошибка загрузки профиля';
                this.isLoading = false;
            }
        });
    }

    private fillFormWithUserData(userData: User): void {
        if (!userData) return;
        console.log('Заполняем форму:', userData);
        this.profileForm.patchValue({
            name: userData.name || '',
            email: userData.email || '',
            phoneNumber: userData.phoneNumber || '',
            // role: userData.role || ''  // Заполняем роль

        });
        console.log('Заполнили форму:', this.role);
        this.profileForm.markAsPristine();
    }

    updateProfile(): void {
        if (this.profileForm.invalid) {
            this.profileForm.markAllAsTouched();
            return;
        }

        this.isSubmitting = true;
        const formData = this.profileForm.value;

        this.userService.updateUserProfile(formData)
            .pipe(finalize(() => (this.isSubmitting = false)))
            .subscribe({
                next: (response) => {
                    this.user = response;
                    this.notificationService.success('Профиль обновлен');
                    this.authService.updateCurrentUser({ ...this.user, ...response });
                },
                error: (err) => this.notificationService.errorFromHttp(err, 'Не удалось обновить профиль')
            });
    }


    updatePassword(): void {
        if (this.passwordForm.invalid || this.passwordsNotMatch()) return;

        this.isSubmitting = true;
        this.userService.updatePassword(
            this.passwordForm.value.currentPassword,
            this.passwordForm.value.newPassword
        )
            .pipe(finalize(() => (this.isSubmitting = false)))
            .subscribe({
                next: () => {
                    this.notificationService.success('Пароль успешно изменен');
                    this.passwordForm.reset();
                },
                error: (err) => this.notificationService.errorFromHttp(err, 'Не удалось изменить пароль')
            });
    }

    deleteAccount(): void {
        if (!confirm('Вы уверены, что хотите удалить аккаунт?')) return;

        this.authService.deleteAccount().subscribe({
            next: () => this.router.navigate(['/']),
            error: (err) => this.notificationService.errorFromHttp(err, 'Не удалось удалить аккаунт')
        });
    }

    becomeOrganizer(): void {
        const formData = this.profileForm.value;
        this.userService.becomeOrganizer(formData).subscribe({
            next: () => {
                this.notificationService.success('Вы теперь организатор');
                this.authService.updateCurrentUser({ ...this.user, role: UserRole.ORGANIZER } as User);
            }
        });

    }

    passwordsNotMatch(): boolean {
        return this.passwordForm.value.newPassword !== this.passwordForm.value.confirmPassword;
    }
}
