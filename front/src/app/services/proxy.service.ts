import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { EventService } from './event.service';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ProxyService {
    private apiUrl = environment.apiUrl;
    private proxyEnabled = true; // Флаг, указывающий использовать ли прокси или заглушку
    private headers = {
        'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
    };

    // Простой in-memory кэш для снижения количества запросов и ускорения UX.
    // Особенно полезно при наборе/стирании дома и повторных одинаковых запросах.
    private cache = new Map<string, { expiresAt: number; value: any }>();
    private readonly searchCacheTtlMs = 60_000;
    private readonly geocodeCacheTtlMs = 5 * 60_000;
    private readonly cacheMaxEntries = 500;

    constructor(
        private http: HttpClient,
        private eventService: EventService
    ) { }

    /**
     * Best-practice: быстрые подсказки через /api/address/suggest.
     * Geocoder дергаем только после выбора подсказки.
     */
    suggestAddress(q: string, results = 5): Observable<any> {
        if (!this.proxyEnabled) {
            return this.eventService.mockGeocodeSearch(q);
        }

        const query = (q || '').trim();
        if (query.length < 3) {
            return of({ results: [] });
        }

        const normalized = query.toLowerCase();
        const cacheKey = `addrSuggest:${results}:${normalized}`;
        const cached = this.cacheGet(cacheKey);
        if (cached) {
            return of(cached);
        }

        const params = new HttpParams()
            .set('q', query)
            .set('results', String(Math.min(results, 5)));

        return this.http.get(`${this.apiUrl}/api/address/suggest`, { params }).pipe(
            tap((payload) => this.cacheSet(cacheKey, payload, this.searchCacheTtlMs)),
            catchError(error => {
                console.error('Ошибка suggestAddress:', error);
                return of({ results: [] });
            })
        );
    }

    /**
     * Best-practice: геокодирование только после выбора подсказки (по id/uri).
     */
    geocodeById(id: string): Observable<any> {
        if (!this.proxyEnabled) {
            return this.eventService.mockGeocodeSearch(id);
        }

        const value = (id || '').trim();
        if (!value) {
            return of({ results: [] });
        }

        const normalized = value.toLowerCase();
        const cacheKey = `addrGeocode:${normalized}`;
        const cached = this.cacheGet(cacheKey);
        if (cached) {
            return of(cached);
        }

        const params = new HttpParams().set('id', value);
        return this.http.get(`${this.apiUrl}/api/address/geocode`, { params }).pipe(
            tap((payload) => this.cacheSet(cacheKey, payload, this.geocodeCacheTtlMs)),
            catchError(error => {
                console.error('Ошибка geocodeById:', error);
                return of({ results: [] });
            })
        );
    }

    private cacheGet(key: string): any | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }

    private cacheSet(key: string, value: any, ttlMs: number): void {
        if (this.cache.size > this.cacheMaxEntries) {
            // Простая защита от разрастания: при переполнении очищаем кэш.
            this.cache.clear();
        }
        this.cache.set(key, { expiresAt: Date.now() + ttlMs, value });
    }

    /**
     * Выполняет геокодирование через серверный прокси
     * @param address Адрес для геокодирования
     * @returns Результат геокодирования с координатами
     */
    geocodeAddress(address: string, kind?: string, results = 5): Observable<any> {
        if (!this.proxyEnabled) {
            return this.eventService.mockGeocodeSearch(address);
        }

        const normalized = (address || '').trim().toLowerCase();
        const cacheKey = `geocode:${kind || ''}:${results}:${normalized}`;
        const cached = this.cacheGet(cacheKey);
        if (cached) {
            return of(cached);
        }

        // Создаем параметры запроса
        let params = new HttpParams()
            .set('address', address)
            .set('results', String(results));

        if (kind) {
            params = params.set('kind', kind);
        }

        // Отправляем запрос через бэкенд-прокси
        return this.http.get(`${this.apiUrl}/geo/geocode`, { params })
            .pipe(
                tap((payload) => this.cacheSet(cacheKey, payload, this.geocodeCacheTtlMs)),
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
    searchPlaces(query: string, kind?: string, results = 7): Observable<any> {
        if (!this.proxyEnabled) {
            return this.eventService.mockGeocodeSearch(query);
        }

        const normalized = (query || '').trim().toLowerCase();
        const cacheKey = `search:${kind || ''}:${results}:${normalized}`;
        const cached = this.cacheGet(cacheKey);
        if (cached) {
            return of(cached);
        }

        let params = new HttpParams()
            .set('query', query)
            .set('results', String(results));

        if (kind) {
            params = params.set('kind', kind);
        }

        return this.http.get(`${this.apiUrl}/geo/search`, { params })
            .pipe(
                tap((payload) => this.cacheSet(cacheKey, payload, this.searchCacheTtlMs)),
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
