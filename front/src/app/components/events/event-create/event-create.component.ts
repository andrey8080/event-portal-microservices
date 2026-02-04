import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventService } from '../../../services/event.service';
import { MapsService, Place } from '../../../services/maps.service';
import { ProxyService } from '../../../services/proxy.service';
import { AuthService } from '../../../services/auth.service';
import { Event } from '../../../models/event.model';
import { HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';
import { findUniversity } from '@app/helpers/educational-institutions';

@Component({
    selector: 'app-event-create',
    templateUrl: './event-create.component.html',
    styleUrls: ['./event-create.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        HttpClientModule
    ]
})
export class EventCreateComponent implements OnInit {
    eventForm!: FormGroup;
    isSubmitting = false;
    errorMessage = '';
    imagePreviews: string[] = [];
    selectedImages: File[] = [];
    mapInitialized = false;
    private map: any;
    private placemark: any;
    debugInfo: string = '';

    constructor(
        private formBuilder: FormBuilder,
        private eventService: EventService,
        private mapsService: MapsService,
        private proxyService: ProxyService,
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
        this.setupAddressAutocomplete();

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
            latitude: [''],
            longitude: [''],
            maxParticipants: [50, [Validators.required, Validators.min(1)]],
            hasQuiz: [false],
            eventCategory: ['OTHER', Validators.required] // Добавлено поле категории
        });

        // Initialize map
        setTimeout(() => {
            this.mapsService.createMap('map-preview', '', undefined, undefined)
                .then((mapData) => {
                    // Сохраняем ссылки на карту и метку
                    this.map = mapData.map;
                    this.placemark = mapData.placemark;
                    this.mapInitialized = true;
                })
                .catch(err => {
                    console.error('Error initializing map:', err);
                });
        }, 300);
    }

    setupAddressAutocomplete(): void {
        setTimeout(() => {
            this.mapsService.initAutocomplete('address-input', (place) => {
                if (place) {
                    this.eventForm.patchValue({
                        address: place.address,
                        latitude: place.latitude,
                        longitude: place.longitude
                    });

                    // Обновляем карту используя метод updateMap вместо createMap напрямую
                    this.updateMap({
                        address: place.address,
                        lat: place.latitude,
                        lng: place.longitude
                    });
                }
            }).catch(err => {
                console.error('Error initializing autocomplete:', err);
            });
        }, 500);
    }

    findCoordinates(): void {
        let searchQuery = this.eventForm.get('address')?.value;
        this.errorMessage = '';
        this.debugInfo = '';

        // Проверяем, что запрос не пустой
        if (!searchQuery || searchQuery.trim() === '') {
            this.errorMessage = 'Пожалуйста, введите адрес или название места';
            return;
        }

        // Исправление типичных опечаток
        const commonMisspellings: Record<string, string> = {
            "кронверский": "кронверкский",
            "конверкский": "кронверкский",
            "исакиевский": "исаакиевский",
            "дворцоая": "дворцовая"
        };

        // Проверяем и корректируем опечатки
        const words = searchQuery.toLowerCase().split(/\s+/);
        const correctedWords = words.map((word: string | number) => commonMisspellings[word] || word);
        const correctedQuery = correctedWords.join(' ');

        // Если была исправлена опечатка, сообщаем пользователю
        if (correctedQuery !== searchQuery.toLowerCase()) {
            searchQuery = correctedQuery;
            this.eventForm.patchValue({ address: correctedQuery });
            this.debugInfo = `Исправлена опечатка в запросе: "${searchQuery}"\n`;
        }

        // Показываем индикатор загрузки
        this.errorMessage = 'Поиск места...';

        // Добавляем отладочную информацию
        this.debugInfo += `Запрос: ${searchQuery}\nAPI-ключ: ${environment.mapsApiKey ? 'Задан' : 'Не задан'}\nВремя запроса: ${new Date().toLocaleTimeString()}`;

        // Проверяем, не является ли запрос поиском вуза (ИТМО, СПбГУ, и т.д.)
        const isEducationalQuery = this.isEducationalQuery(searchQuery);
        if (isEducationalQuery) {
            this.debugInfo += '\nОпределен поиск учебного заведения, используем специальный метод';
        }

        // Используем таймаут, чтобы UI обновился с сообщением о загрузке
        setTimeout(() => {
            // Выбираем метод поиска в зависимости от типа запроса
            const searchPromise = this.mapsService.searchPlaces(searchQuery);

            searchPromise
                .then(places => {
                    this.errorMessage = '';

                    this.debugInfo += `\nНайдено мест: ${places.length}`;
                    console.log('Результаты поиска:', places);

                    if (places && places.length > 0) {
                        const place = places[0];

                        this.debugInfo += `\nВыбрано место: ${place.name || 'Без названия'}\nАдрес: ${place.address || 'Не указан'}\nКоординаты: ${place.lat}, ${place.lng}`;
                        if (place.type) {
                            this.debugInfo += `\nТип объекта: ${place.type}`;
                        }

                        this.eventForm.patchValue({
                            address: place.address,
                            latitude: place.lat,
                            longitude: place.lng
                        });

                        // Обновляем карту
                        this.updateMap(place);
                    } else {
                        this.errorMessage = 'Не удалось найти указанное место. Попробуйте более точный запрос.';
                        this.debugInfo += '\nНе найдены результаты для данного запроса';
                    }
                })
                .catch(err => {
                    console.error('Search error:', err);

                    // Улучшенная обработка ошибки с детальной информацией
                    let errorDetails = '';
                    try {
                        errorDetails = typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err);
                    } catch (e) {
                        errorDetails = 'Ошибка не может быть преобразована в строку';
                    }

                    this.debugInfo += `\nОшибка поиска: ${errorDetails}`;

                    // Определяем тип ошибки и показываем соответствующее сообщение
                    if (typeof err === 'object' && err && err.message === 'scriptError') {
                        this.errorMessage = 'Ошибка доступа к API Яндекс Карт. Попробуйте обновить страницу или использовать VPN.';
                        this.debugInfo += '\nВозможная причина: блокировка CORS';
                    } else if (typeof err === 'string' && err.includes('apikey')) {
                        this.errorMessage = 'Ошибка API-ключа Яндекс Карт.';
                    } else if (typeof err === 'string' && (err.includes('status 400') || err.includes('Bad Request'))) {
                        this.errorMessage = 'Некорректный запрос к API Яндекс Карт.';
                    } else {
                        this.errorMessage = 'Ошибка при поиске места. Попробуйте другой запрос.';
                    }
                });
        }, 100);
    }

    /**
     * Специальный поиск для учебных заведений
     */
    private searchEducationalInstitution(query: string): Promise<Place[]> {
        // Сначала проверяем известные университеты
        const knownUniversity = findUniversity(query);
        if (knownUniversity) {
            return Promise.resolve([{
                name: knownUniversity.fullName,
                address: knownUniversity.address,
                lat: knownUniversity.coordinates.lat,
                lng: knownUniversity.coordinates.lng,
                type: 'Учебное заведение'
            }]);
        }

        // Если не найден в известных, используем стандартный поиск
        return this.mapsService.searchPlaces(query + ' университет')
            .then(places => {
                if (places && places.length > 0) {
                    return places;
                }
                // Если не нашли с "университет", пробуем с "институт"
                return this.mapsService.searchPlaces(query + ' институт');
            })
            .catch(() => {
                // В случае ошибки, возвращаемся к обычному поиску
                return this.mapsService.searchPlaces(query);
            });
    }

    /**
     * Проверяет, является ли запрос поиском учебного заведения
     */
    private isEducationalQuery(query: string): boolean {
        const normalizedQuery = query.toLowerCase();
        const educationalKeywords = [
            'итмо', 'спбгу', 'спбпу', 'лэти', 'спбгэту', 'политех',
            'университет', 'институт', 'академия', 'вуз'
        ];

        return educationalKeywords.some(keyword => normalizedQuery.includes(keyword));
    }

    // Выносим обновление карты в отдельный метод для лучшей читаемости кода
    private updateMap(place: { address: string, lat: number, lng: number }): void {
        // Сначала удалим текущую карту, если она существует
        if (this.mapInitialized && this.map) {
            this.mapsService.destroyMap('map-preview', this.map);
            this.debugInfo += '\nПредыдущая карта удалена';
        }

        // Создаём новую карту
        this.mapsService.createMap('map-preview', place.address, place.lat, place.lng)
            .then((mapData) => {
                this.map = mapData.map;
                this.placemark = mapData.placemark;
                this.mapInitialized = true;
                this.debugInfo += '\nКарта успешно создана';
            })
            .catch(err => {
                console.error('Error updating map:', err);
                this.debugInfo += `\nОшибка при обновлении карты: ${err}`;
                this.errorMessage = 'Место найдено, но не удалось отобразить карту';
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
