import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, delay } from 'rxjs/operators';
import { Event } from '../models/event.model';
import { EventDTO, eventToDTO, dtoToEvent } from '../models/event-dto.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root' // Важно указать root для использования в standalone компонентах
})
export class EventService {
  private apiUrl = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) { }

  getEvents(): Observable<Event[]> {
    return this.http.get<EventDTO[]>(`${this.apiUrl}`)
      .pipe(
        map(dtos => dtos.map(dto => dtoToEvent(dto))),
        catchError(error => throwError(() => error))
      );
  }

  getEvent(id: number): Observable<Event> {
    return this.http.get<EventDTO>(`${this.apiUrl}/${id}`)
      .pipe(
        map(dto => dtoToEvent(dto)),
        catchError(error => throwError(() => error))
      );
  }

  createEvent(event: Event): Observable<any> {
    const eventDTO = eventToDTO(event);
    return this.http.post<any>(`${this.apiUrl}`, eventDTO)
      .pipe(catchError(error => throwError(() => error)));
  }

  updateEvent(event: Event): Observable<any> {
    const eventDTO = eventToDTO(event);
    return this.http.put<any>(`${this.apiUrl}/${event.id}`, eventDTO)
      .pipe(catchError(error => throwError(() => error)));
  }

  deleteEvent(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`)
      .pipe(catchError(error => throwError(() => error)));
  }

  registerForEvent(eventId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${eventId}/registrations`, null)
      .pipe(catchError(error => throwError(() => error)));
  }

  checkRegistration(eventId: number): Observable<boolean> {
    return this.http.get<any>(`${this.apiUrl}/${eventId}/registrations/me`).pipe(
      map(response => response?.registered === true),
      catchError(() => of(false))
    );
  }

  cancelRegistration(id: number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}/registrations/me`)
      .pipe(catchError(error => throwError(() => error)));
  }

  getRegisteredUsers(eventId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${eventId}/registrations`)
      .pipe(
        catchError(error => throwError(() => error))
      );
  }

  submitFeedback(eventId: number, rating: number, comment: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${eventId}/feedback`, { rating, comment })
      .pipe(
        catchError(error => throwError(() => error))
      );
  }

  uploadEventImage(eventId: number, file: File): Promise<any> {
    return Promise.reject(new Error('Upload image endpoint is not available in event-service API'));
  }

  getUserEvents(userId: number): Observable<Event[]> {
    return this.http.get<EventDTO[]>(`${this.apiUrl}/me/created`).pipe(
      map(dtos => dtos.map(dto => dtoToEvent(dto))),
      catchError(error => throwError(() => error))
    );
  }

  // Добавляем метод для получения событий пользователя
  getUserParticipatedEvents(userId: number): Observable<Event[]> {
    return this.http.get<EventDTO[]>(`${this.apiUrl}/users/${userId}/participated`).pipe(
      map(dtos => dtos.map(dto => dtoToEvent(dto))),
      catchError(error => throwError(() => error))
    );
  }

  // Временный метод для эмуляции прокси геокодирования (пока не реализовано на бэкенде)
  mockGeocodeSearch(query: string): Observable<any> {
    console.log('Эмуляция поиска для запроса:', query);

    // Предопределенные результаты для некоторых популярных мест
    const mockResults: { [key: string]: any } = {
      'красная площадь': {
        results: [
          {
            name: 'Красная площадь',
            address: 'Россия, Москва, Красная площадь',
            lat: 55.753544,
            lng: 37.621202
          }
        ]
      },
      'санкт-петербург': {
        results: [
          {
            name: 'Санкт-Петербург',
            address: 'Россия, Санкт-Петербург',
            lat: 59.939099,
            lng: 30.315877
          }
        ]
      },
      'кронверский проспект': {
        results: [
          {
            name: 'Кронверкский проспект',
            address: 'Россия, Санкт-Петербург, Кронверкский проспект',
            lat: 59.955714,
            lng: 30.318207
          }
        ]
      },
      'санкт-петербург, кронверский проспект 49': {
        results: [
          {
            name: 'Университет ИТМО',
            address: 'Россия, Санкт-Петербург, Кронверкский проспект, 49',
            lat: 59.957184,
            lng: 30.308197
          }
        ]
      }
    };

    // Нормализуем поисковый запрос для сравнения
    const normalizedQuery = query.toLowerCase().trim();

    // Ищем по ключам или частичному совпадению
    for (const key in mockResults) {
      if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
        return of(mockResults[key]).pipe(delay(500)); // Имитируем задержку сети
      }
    }

    // Если не нашли точного совпадения, возвращаем пустой результат
    return of({ results: [] }).pipe(delay(500));
  }
}