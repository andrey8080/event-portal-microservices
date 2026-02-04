import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EventService } from '../../../services/event.service';
import { MapsService, Place } from '../../../services/maps.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-event-edit',
  templateUrl: './event-edit.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class EventEditComponent implements OnInit {
  eventForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  debugInfo: string = '';

  // Для работы с картой
  map: any;
  placemark: any;
  mapInitialized: boolean = false;

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private mapsService: MapsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.eventForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
    //   // Формат: YYYY-MM-DD
    //   startDate: ['', Validators.required],
    //   // Формат: HH:mm
    //   startTime: ['', Validators.required],
    //   // Формат: YYYY-MM-DD
    //   endDate: ['', Validators.required],
    //   // Формат: HH:mm
    //   endTime: ['', Validators.required],
      price: [0, Validators.required],
      maxParticipants: [1, Validators.required],
      hasQuiz: [false],
      address: ['', Validators.required],
    //   latitude: [''],
    //   longitude: ['']
    });

    const eventId = +this.route.snapshot.paramMap.get('id')!;
    this.eventService.getEvent(eventId).subscribe({
      next: (data) => {
        // Предполагаем, что данные с сервера содержат startDate и endDate в формате "YYYY-MM-DD HH:mm:ss"
        // const [startDatePart, startTimePart] = data.startDate.split(' ');
        // const [endDatePart, endTimePart] = data.endDate.split(' ');
        this.eventForm.patchValue({
          title: data.title,
          description: data.description,
        //   startDate: startDatePart,
        //   startTime: startTimePart.slice(0, 5),
        //   endDate: endDatePart,
        //   endTime: endTimePart.slice(0, 5),
          price: data.price,
          maxParticipants: data.maxParticipants,
          hasQuiz: data.hasQuiz,
          address: data.address,
        //   latitude: data.latitude,
        //   longitude: data.longitude
        });
      },
      error: () => {
        this.errorMessage = 'Ошибка при загрузке данных события.';
      }
    });
  }
  
  onSubmit(): void {
    if (this.eventForm.invalid) return;
    this.isSubmitting = true;
    
    const formValues = this.eventForm.value;
    // Допустим, сервер ожидает дату в виде строки или ISO-формате.
    const startDateTime = new Date(`${formValues.startDate}T${formValues.startTime}`);
    const endDateTime = new Date(`${formValues.endDate}T${formValues.endTime}`);
    if (endDateTime <= startDateTime) {
      this.errorMessage = 'Дата окончания должна быть позже даты начала';
      this.isSubmitting = false;
      return;
    }
    
    // Подготовка данных для обновления; реализация зависит от API
    const updatedEventData = {
      ...formValues,
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString()
      // Дополните объект, если требуется
    };
    
    this.eventService.updateEvent(updatedEventData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/events']);
      },
      error: () => {
        this.errorMessage = 'Ошибка при обновлении события.';
        this.isSubmitting = false;
      }
    });
  }
  
  // Метод поиска места по адресу с использованием mapsService
  findCoordinates(): void {
    let searchQuery = this.eventForm.get('address')?.value;
    this.errorMessage = '';
    this.debugInfo = '';

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

    const words = searchQuery.toLowerCase().split(/\s+/);
    const correctedWords = words.map((word: string) => commonMisspellings[word] || word);
    const correctedQuery = correctedWords.join(' ');

    if (correctedQuery !== searchQuery.toLowerCase()) {
      searchQuery = correctedQuery;
      this.eventForm.patchValue({ address: correctedQuery });
      this.debugInfo = `Исправлена опечатка в запросе: "${searchQuery}"\n`;
    }

    this.errorMessage = 'Поиск места...';
    this.debugInfo += `Запрос: ${searchQuery}\nAPI-ключ: ${environment.mapsApiKey ? 'Задан' : 'Не задан'}\nВремя запроса: ${new Date().toLocaleTimeString()}`;

    setTimeout(() => {
      const searchPromise = this.mapsService.searchPlaces(searchQuery);
      searchPromise.then((places: Place[]) => {
        this.errorMessage = '';
        this.debugInfo += `\nНайдено мест: ${places.length}`;
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
          this.updateMap(place);
        } else {
          this.errorMessage = 'Не удалось найти указанное место. Попробуйте более точный запрос.';
          this.debugInfo += '\nНе найдены результаты для данного запроса';
        }
      }).catch(err => {
        console.error('Search error:', err);
        let errorDetails = '';
        try {
          errorDetails = typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err);
        } catch (e) {
          errorDetails = 'Ошибка не может быть преобразована в строку';
        }
        this.debugInfo += `\nОшибка поиска: ${errorDetails}`;
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

  // Обновляет карту с выбранными координатами
  private updateMap(place: { address: string, lat: number, lng: number }): void {
    if (this.mapInitialized && this.map) {
      this.mapsService.destroyMap('map-preview', this.map);
      this.debugInfo += '\nПредыдущая карта удалена';
    }

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
}

