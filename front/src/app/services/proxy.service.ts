import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { EventService } from './event.service';
import { catchError, delay, retry } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ProxyService {
    private apiUrl = environment.apiUrl;
    private proxyEnabled = true; // Флаг, указывающий использовать ли прокси или заглушку
    private headers = {
        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
    };

    constructor(
        private http: HttpClient,
        private eventService: EventService
    ) { }

    /**
     * Выполняет геокодирование через серверный прокси
     * @param address Адрес для геокодирования
     * @returns Результат геокодирования с координатами
     */
    geocodeAddress(address: string): Observable<any> {
        if (!this.proxyEnabled) {
            return this.eventService.mockGeocodeSearch(address);
        }

        // Создаем параметры запроса
        let params = new HttpParams()
            .set('address', address)
            .set('apikey', environment.mapsApiKey || '');

        // Отправляем запрос через бэкенд-прокси
        return this.http.get(`${this.apiUrl}/geo/geocode`, { params })
            .pipe(
                catchError(error => {
                    console.error('Ошибка при геокодировании через прокси:', error);
                    // Если произошла ошибка, переходим на моковые данные
                    return this.eventService.mockGeocodeSearch(address);
                })
            );
    }

    /**
     * Поиск мест по названию через прокси
     * @param query Поисковый запрос (название места или адрес)
     * @returns Результат поиска с координатами и адресами
     */
    searchPlaces(query: string): Observable<any> {
        if (!this.proxyEnabled) {
            return this.eventService.mockGeocodeSearch(query);
        }

        let params = new HttpParams()
            .set('query', query)
            .set('apikey', environment.mapsApiKey || '');

        return this.http.get(`${this.apiUrl}/geo/search`, { params })
            .pipe(
                catchError(error => {
                    console.error('Ошибка при поиске через прокси:', error);
                    // Если произошла ошибка, переходим на моковые данные
                    return this.eventService.mockGeocodeSearch(query);
                })
            );
    }

    /**
     * Поиск организаций по названию через прокси-сервер
     * @param query Название организации или места для поиска
     */
    public searchBusinesses(query: string): Observable<any> {
        if (!this.proxyEnabled) {
            return this.eventService.mockGeocodeSearch(query);
        }

        let params = new HttpParams()
            .set('query', query)
            .set('apikey', environment.mapsApiKey || '');

        return this.http.get<any>(`${this.apiUrl}/geo/search/biz`, {
            params,
            headers: this.headers
        }).pipe(
            catchError(error => {
                console.error('Ошибка при поиске организаций через прокси:', error);
                // Если произошла ошибка, переходим на моковые данные
                return this.eventService.mockGeocodeSearch(query);
            })
        );
    }

    /**
     * Поиск учебных заведений по названию через прокси-сервер
     * @param name Название учебного заведения для поиска
     */
    public searchEducationalInstitution(name: string): Observable<any> {
        if (!this.proxyEnabled) {
            return this.eventService.mockGeocodeSearch(name);
        }

        let params = new HttpParams()
            .set('query', name + ' университет')
            .set('apikey', environment.mapsApiKey || '');

        // Сначала пробуем поиск с университет
        return this.http.get<any>(`${this.apiUrl}/geo/search/biz`, { params })
            .pipe(
                catchError((error) => {
                    // Если не нашли с "университет", пробуем с "институт"
                    params = new HttpParams()
                        .set('query', name + ' институт')
                        .set('apikey', environment.mapsApiKey || '');

                    return this.http.get<any>(`${this.apiUrl}/geo/search/biz`, { params })
                        .pipe(
                            catchError(() => {
                                // Если все попытки не удались, возвращаемся к обычному поиску
                                return this.searchPlaces(name);
                            })
                        );
                })
            );
    }
}
