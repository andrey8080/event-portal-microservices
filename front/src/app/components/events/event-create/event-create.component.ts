import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventService } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { Event } from '../../../models/event.model';
import { HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AddressInputComponent } from '../../shared/address-input/address-input.component';

@Component({
    selector: 'app-event-create',
    templateUrl: './event-create.component.html',
    styleUrls: ['./event-create.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        HttpClientModule,
        AddressInputComponent
    ]
})
export class EventCreateComponent implements OnInit {
    eventForm!: FormGroup;
    isSubmitting = false;
    errorMessage = '';
    imagePreviews: string[] = [];
    selectedImages: File[] = [];
    debugInfo: string = '';

    constructor(
        private formBuilder: FormBuilder,
        private eventService: EventService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        // Check if user is organizer
        if (!this.authService.isOrganizer() && !this.authService.isAdmin()) {
            this.router.navigate(['/']);
            return;
        }

        this.initForm();

        // Проверяем наличие API-ключа сразу
        try {
            if (!environment.mapsApiKey) {
                this.errorMessage = 'Не задан API-ключ Яндекс Карт в конфигурации приложения';
                this.debugInfo = 'Отсутствует mapsApiKey в файле environment.ts';
            }
        } catch (e) {
            console.error('Ошибка при проверке API-ключа:', e);
        }
    }

    initForm(): void {
        this.eventForm = this.formBuilder.group({
            title: ['', Validators.required],
            description: ['', Validators.required],
            startDate: ['', Validators.required],
            startTime: ['', Validators.required],
            endDate: ['', Validators.required],
            endTime: ['', Validators.required],
            price: [0, [Validators.required, Validators.min(0)]],
            address: ['', Validators.required],
            latitude: ['', Validators.required],
            longitude: ['', Validators.required],
            maxParticipants: [50, [Validators.required, Validators.min(1)]],
            hasQuiz: [false],
            eventCategory: ['OTHER', Validators.required] // Добавлено поле категории
        });
    }

    onImagesSelected(event: any): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        if (input.files.length + this.selectedImages.length > 5) {
            this.errorMessage = 'Вы можете загрузить максимум 5 изображений';
            return;
        }

        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            this.selectedImages.push(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreviews.push(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }

    removeImage(index: number): void {
        this.imagePreviews.splice(index, 1);
        this.selectedImages.splice(index, 1);
    }

    onSubmit(): void {
        if (this.eventForm.invalid) return;

        this.isSubmitting = true;

        const formValues = this.eventForm.value;

        // Combine date and time
        const startDateTime = new Date(`${formValues.startDate}T${formValues.startTime}`);
        const endDateTime = new Date(`${formValues.endDate}T${formValues.endTime}`);

        // Check if end date is after start date
        if (endDateTime <= startDateTime) {
            this.errorMessage = 'Дата окончания должна быть позже даты начала';
            this.isSubmitting = false;
            return;
        }

        // Get current user for organizer data
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) {
            this.errorMessage = 'Необходимо войти в систему для создания события';
            this.isSubmitting = false;
            return;
        }

        // Create event object
        const event: Event = {
            id: 0, // Will be assigned by the server
            title: formValues.title,
            description: formValues.description,
            startDate: startDateTime,
            endDate: endDateTime,
            location: {
                address: formValues.address,
                latitude: formValues.latitude ? parseFloat(formValues.latitude) : undefined,
                longitude: formValues.longitude ? parseFloat(formValues.longitude) : undefined
            },
            organizerId: currentUser.id,
            organizerName: currentUser.name,
            price: formValues.price,
            maxParticipants: formValues.maxParticipants,
            registeredParticipants: 0, // Initial value for a new event
            hasQuiz: formValues.hasQuiz,
            eventCategory: formValues.eventCategory, // Добавлено поле категории
            images: [] // We'll handle image upload separately
        };

        // First save the event, then handle image uploads
        this.eventService.createEvent(event).subscribe({
            next: (createdEvent) => {
                if (this.selectedImages.length > 0) {
                    // Upload images if there are any
                    this.uploadImages(createdEvent.id).then(() => {
                        this.isSubmitting = false;
                        this.router.navigate(['']);
                    }).catch(err => {
                        console.error('Image upload error:', err);
                        this.errorMessage = 'Событие создано, но возникла ошибка при загрузке изображений';
                        this.isSubmitting = false;
                        this.router.navigate(['']);
                    });
                } else {
                    // No images to upload
                    this.isSubmitting = false;
                    this.router.navigate(['']);
                }
            },
            error: (err) => {
                console.error('Event creation error:', err);
                this.errorMessage = 'Ошибка при создании события';
                this.isSubmitting = false;
            }
        });
    }

    // Handle image uploads separately
    async uploadImages(eventId: number): Promise<void> {
        const uploadPromises = this.selectedImages.map(image => {
            return this.eventService.uploadEventImage(eventId, image);
        });

        await Promise.all(uploadPromises);
    }

    /**
     * Метод для ручной проверки доступности API Яндекс Карт
     * Пользователь может вызвать его, чтобы протестировать соединение
     */
    testYandexMapsApi(): void {
        this.errorMessage = 'Проверка соединения с API Яндекс Карт...';
        this.debugInfo = `Время запроса: ${new Date().toISOString()}`;

        fetch(`https://api-maps.yandex.ru/2.1/?apikey=${environment.mapsApiKey}&lang=ru_RU`, {
            method: 'GET',
            mode: 'no-cors' // Пробуем обойти CORS
        })
            .then(() => {
                this.errorMessage = 'Сервис Яндекс Карт доступен';
                this.debugInfo += '\nБазовый запрос к API выполнен успешно';
            })
            .catch(err => {
                this.errorMessage = 'Возникла ошибка при проверке доступности API Яндекс Карт';
                this.debugInfo += `\nОшибка при проверке API: ${err}`;
            });
    }
}
