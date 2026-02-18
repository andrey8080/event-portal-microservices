import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { findUniversity, SAINT_PETERSBURG_UNIVERSITIES } from '../helpers/educational-institutions';
import { findKnownPlace, SAINT_PETERSBURG_PLACES } from '../helpers/places-data';

/**
 * Интерфейс для представления места на карте
 */
export interface Place {
    name: string;        // Название места
    address: string;     // Полный адрес
    lat: number;         // Широта
    lng: number;         // Долгота
    type?: string;       // Тип места (опциональный)
    precision?: string;  // Точность геокодирования
    kind?: string;       // kind из геокодера (house/street/locality/...)
}

export interface GeocodeOptions {
    kind?: string;
    boundedBy?: number[][];
    strictBounds?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class MapsService {
    private apiLoaded = false;
    private apiKey: string;
    private searchCache = new Map<string, Place[]>();  // Кэш результатов поиска

    constructor() {
        this.apiKey = environment.mapsApiKey || '';
        if (!this.apiKey) {
            console.error('API ключ Яндекс Карт не указан в environment.ts. Добавьте ключ: mapsApiKey');
        }
    }

    /**
     * Загрузка Yandex Maps API если ещё не загружен
     */
    private loadApi(): Promise<boolean> {
        // Если API уже загружен, возвращаем true
        if (this.apiLoaded && (window as any).ymaps) {
            return Promise.resolve(true);
        }

        return new Promise((resolve, reject) => {
            // Проверяем наличие API-ключа
            if (!this.apiKey) {
                reject(new Error('API ключ Яндекс Карт не задан'));
                return;
            }

            // Если объект ymaps уже существует, значит скрипт уже был загружен
            if ((window as any).ymaps) {
                (window as any).ymaps.ready(() => {
                    this.apiLoaded = true;
                    resolve(true);
                });
            } else {
                // Создаём и добавляем скрипт в DOM
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.crossOrigin = "anonymous";

                // Указываем все необходимые модули при загрузке API.
                // Не добавляем cache-busting параметры, чтобы браузер мог кешировать скрипт.
                script.src = `https://api-maps.yandex.ru/2.1/?apikey=${this.apiKey}&lang=ru_RU&load=Map,Placemark,control.ZoomControl,control.SearchControl,SuggestView,suggest`;

                script.onload = () => {
                    // После загрузки скрипта ждём готовности API
                    if ((window as any).ymaps) {
                        (window as any).ymaps.ready(() => {
                            this.apiLoaded = true;
                            resolve(true);
                        });
                    } else {
                        reject(new Error('API скрипт загружен, но объект ymaps не найден'));
                    }
                };

                script.onerror = (error) => {
                    console.error('Ошибка при загрузке Яндекс Карт API:', error);
                    reject(new Error(`Не удалось загрузить Яндекс Карты API`));
                };

                document.head.appendChild(script);
            }
        });
    }

    private getYmaps(): any | null {
        return (window as any)?.ymaps || null;
    }

    /**
     * Быстрые подсказки для автодополнения (без геокодирования).
     * Работает напрямую через Yandex Maps JS API.
     */
    async suggest(query: string): Promise<string[]> {
        const q = (query || '').trim();
        if (q.length < 2) return [];

        await this.loadApi();
        const ymaps = this.getYmaps();
        if (!ymaps?.suggest) {
            return [];
        }

        const items = await ymaps.suggest(q);
        if (!Array.isArray(items)) return [];

        return items
            .map((it: any) => it?.value || it?.displayName || it?.title || String(it))
            .filter((v: any) => typeof v === 'string' && v.trim().length > 0);
    }

    /**
     * Геокодирование через Yandex Maps JS API (динамический поиск по любым адресам).
     */
    async geocodePlaces(address: string, maxResults = 5, options?: GeocodeOptions): Promise<Place[]> {
        const query = (address || '').trim();
        if (query.length < 2) return [];

        await this.loadApi();
        const ymaps = this.getYmaps();
        if (!ymaps?.geocode) {
            return [];
        }

        const geocodeOptions: any = {
            results: maxResults,
            ...(options?.kind ? { kind: options.kind } : {}),
            ...(options?.boundedBy ? { boundedBy: options.boundedBy } : {}),
            ...(options?.strictBounds ? { strictBounds: true } : {}),
        };

        const response = await ymaps.geocode(query, geocodeOptions);
        const geoObjects = response?.geoObjects;
        if (!geoObjects || typeof geoObjects.each !== 'function') {
            return [];
        }

        const places: Place[] = [];
        geoObjects.each((obj: any) => {
            const coords = obj?.geometry?.getCoordinates?.();
            if (!Array.isArray(coords) || coords.length < 2) return;

            const name = obj?.properties?.get?.('name') || query;
            const fullAddress = obj?.getAddressLine?.() || obj?.properties?.get?.('text') || name;

            const kind = obj?.properties?.get?.('metaDataProperty.GeocoderMetaData.kind');
            const precision = obj?.properties?.get?.('metaDataProperty.GeocoderMetaData.precision');

            places.push({
                name,
                address: fullAddress,
                // В Yandex Maps JS API coords = [lat, lng]
                lat: Number(coords[0]),
                lng: Number(coords[1]),
                type: kind ? this.mapKindToType(String(kind)) : undefined,
                precision: precision ? String(precision) : undefined,
                kind: kind ? String(kind) : undefined,
            });
        });

        return places.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    }

    /**
     * Подбор только населённых пунктов (город/посёлок и т.п.) для первой стадии автодополнения.
     */
    async geocodeLocalities(query: string, maxResults = 7): Promise<Place[]> {
        const list = await this.geocodePlaces(query, maxResults, { kind: 'locality' });
        // На всякий случай отфильтруем, если геокодер вернул не locality
        return list.filter(p => p.kind === 'locality');
    }

    private mapKindToType(kind: string): string {
        switch (kind) {
            case 'house':
                return 'Здание';
            case 'street':
                return 'Улица';
            case 'metro':
                return 'Станция метро';
            case 'district':
                return 'Район';
            case 'locality':
                return 'Населённый пункт';
            case 'province':
                return 'Регион';
            case 'country':
                return 'Страна';
            default:
                return 'Место';
        }
    }

    /**
     * Адаптивный поиск мест с использованием разных API и локальной базы данных
     * @param query Текст запроса (адрес, название, достопримечательность)
     * @returns Список найденных мест
     */
    async searchPlaces(query: string): Promise<Place[]> {
        if (!query || query.trim().length < 2) {
            return [];
        }

        // Проверяем локальную базу известных мест для исправления опечаток
        const knownPlace = findKnownPlace(query);
        if (knownPlace) {
            console.log('Найдено известное место в локальной базе:', knownPlace.name);
            return [{
                name: knownPlace.name,
                address: knownPlace.address,
                lat: knownPlace.coordinates.lat,
                lng: knownPlace.coordinates.lng,
                type: knownPlace.type || 'Место'
            }];
        }

        // Проверяем, является ли запрос известным вузом из нашей базы
        const university = findUniversity(query);
        if (university) {
            console.log('Найден известный вуз в базе данных:', university.shortName);
            return [{
                name: university.fullName,
                address: university.address,
                lat: university.coordinates.lat,
                lng: university.coordinates.lng,
                type: 'Учебное заведение'
            }];
        }

        // Нормализуем запрос для кэширования
        const normalizedQuery = query.toLowerCase().trim();

        // Проверяем кэш
        if (this.searchCache.has(normalizedQuery)) {
            console.log('Используем кэшированный результат поиска для:', query);
            return this.searchCache.get(normalizedQuery) || [];
        }

        try {
            console.log('Начинаем адаптивный поиск для:', query);

            // 0. Динамический поиск по любым адресам через Yandex Maps JS API.
            // Это снижает нагрузку на наш бэкенд и избегает 500 при отсутствующем ключе на сервере.
            try {
                const ymapsPlaces = await this.geocodePlaces(query, 7);
                if (ymapsPlaces.length > 0) {
                    this.searchCache.set(normalizedQuery, ymapsPlaces);
                    return ymapsPlaces;
                }
            } catch (e) {
                // Если JS API недоступен, возвращаем пустой список
            }
            // Если ничего не нашли, возвращаем пустой массив
            return [];
        } catch (error) {
            console.error('Ошибка при адаптивном поиске мест:', error);

            // При ошибке проверяем резервные данные
            for (const knownPlace of SAINT_PETERSBURG_PLACES) {
                const placeQuery = knownPlace.query.toLowerCase();
                const queryLower = query.toLowerCase();

                if (queryLower.includes(placeQuery) || placeQuery.includes(queryLower)) {
                    console.log('Используем резервные данные для запроса:', query);
                    return [{
                        name: knownPlace.name,
                        address: knownPlace.address,
                        lat: knownPlace.coordinates.lat,
                        lng: knownPlace.coordinates.lng,
                        type: knownPlace.type || 'Место'
                    }];
                }
            }

            throw new Error(`Не удалось выполнить поиск: ${error}`);
        }
    }

    /**
     * Проверяет, похож ли запрос на адрес
     */
    private looksLikeAddress(query: string): boolean {
        // Признаки адреса: содержит номер дома
        return /\s+\d+\s*$/.test(query) || // Заканчивается на цифры после пробела
            /улица|проспект|шоссе|переулок|бульвар|набережная|площадь|пр\.|пр\-т|ул\./i.test(query);
    }

    /**
     * Проверяет, похож ли запрос на название организации
     */
    private looksLikeOrganization(query: string): boolean {
        // Признаки организации: нет цифр, не содержит улицу/проспект
        return !this.looksLikeAddress(query) &&
            !/улица|проспект|шоссе|переулок|бульвар|набережная|площадь/i.test(query);
    }

    /**
     * Обработка результатов поиска, улучшение данных
     */
    private processResults(results: any[], query: string): Place[] {
        return results.map(item => {
            const result: Place = {
                name: item.name || query,
                address: item.address || item.name || query,
                lat: item.lat,
                lng: item.lng,
                type: item.type,
                precision: item.precision
            };

            // Если это поиск с домом, пробуем найти номер дома в запросе
            if (this.looksLikeAddress(query)) {
                const houseNumberMatch = query.match(/\s+(\d+)\s*$/);
                if (houseNumberMatch && !result.name.match(/\d+/)) {
                    result.name += `, ${houseNumberMatch[1]}`;
                }

                // Проверка и коррекция типа
                if (!result.type) {
                    result.type = "Адрес";
                }
            }

            return result;
        });
    }


    /**
     * Геокодирование адреса для получения координат
     * @param address Адрес для геокодирования
     * @returns Координаты адреса {lat, lng}
     */
    async geocodeAddress(address: string): Promise<{ lat: number, lng: number }> {
        if (!address || address.trim().length < 2) {
            return Promise.reject(new Error('Слишком короткий адрес'));
        }

        try {
            // Сначала пробуем JS API (динамический поиск)
            const places = await this.geocodePlaces(address, 1);
            if (places.length > 0) {
                return { lat: places[0].lat, lng: places[0].lng };
            }
            throw new Error('Не удалось определить координаты для указанного адреса');
        } catch (error) {
            console.error('Ошибка при геокодировании:', error);
            throw new Error(`Не удалось определить координаты: ${error}`);
        }
    }

    /**
     * Инициализация автодополнения для поля ввода адреса
     * @param inputElementId ID элемента input для автодополнения
     * @param callback Функция, вызываемая при выборе места
     */
    async initAutocomplete(inputElementId: string, callback: (place: any) => void): Promise<any> {
        try {
            await this.loadApi();

            const ymapsApi = this.getYmaps();
            if (!ymapsApi) {
                throw new Error('Yandex Maps API не загружен');
            }

            const inputElement = document.getElementById(inputElementId) as HTMLInputElement;
            if (!inputElement) {
                throw new Error(`Элемент с ID ${inputElementId} не найден`);
            }

            // Создаем объект SuggestView для автодополнения
            const suggestView = new ymapsApi.SuggestView(inputElementId);

            // Подписываемся на событие выбора элемента из списка
            suggestView.events.add('select', async (e: any) => {
                const selectedValue = e.get('item').value;

                try {
                    // Получаем координаты выбранного места через прокси
                    const places = await this.searchPlaces(selectedValue);

                    if (places && places.length > 0) {
                        const place = places[0];
                        callback({
                            address: place.address,
                            latitude: place.lat,
                            longitude: place.lng
                        });
                    }
                } catch (error) {
                    console.error('Ошибка при получении данных для выбранного места:', error);
                }
            });

            return suggestView;
        } catch (error) {
            console.error('Ошибка инициализации автодополнения:', error);
            throw error;
        }
    }

    /**
     * Создание карты по адресу или координатам
     * @param elementId ID DOM-элемента для отображения карты
     * @param address Адрес места (используется для отображения в балуне)
     * @param lat Широта (если известна)
     * @param lng Долгота (если известна)
     */
    async createMap(elementId: string, address: string, lat?: number, lng?: number): Promise<any> {
        try {
            // Проверяем существование элемента на странице
            const mapElement = document.getElementById(elementId);
            if (!mapElement) {
                throw new Error(`Элемент с ID ${elementId} не найден`);
            }

            // Если координаты не указаны, пытаемся получить их по адресу
            if (!lat || !lng) {
                if (address && address.trim() !== '') {
                    try {
                        const coords = await this.geocodeAddress(address);
                        lat = coords.lat;
                        lng = coords.lng;
                    } catch (error) {
                        console.warn('Не удалось получить координаты для адреса:', error);
                        // Используем координаты Санкт-Петербурга по умолчанию
                        lat = 59.9343;
                        lng = 30.3351;
                    }
                } else {
                    // Используем координаты Санкт-Петербурга по умолчанию
                    lat = 59.9343;
                    lng = 30.3351;
                    address = 'Санкт-Петербург';
                }
            }

            // Загружаем API и создаем карту
            await this.loadApi();

            const ymapsApi = this.getYmaps();
            if (!ymapsApi) {
                throw new Error('Yandex Maps API не загружен');
            }

            // Инициализация карты
            // В Yandex Maps JS API порядок координат: [lat, lng]
            const map = new ymapsApi.Map(elementId, {
                center: [lat, lng],
                zoom: 15,
                controls: ['zoomControl']
            });

            // Добавляем метку на карту
            const placemark = new ymapsApi.Placemark([lat, lng], {
                balloonContent: address
            }, {
                preset: 'islands#redDotIcon'
            });

            map.geoObjects.add(placemark);

            return { map, placemark };
        } catch (error) {
            console.error('Ошибка при создании карты:', error);
            throw error;
        }
    }

    /**
     * Удаление существующей карты и освобождение ресурсов
     * @param elementId ID DOM-элемента, содержащего карту
     * @param map Объект карты, если был сохранен в компоненте (опционально)
     * @returns true, если карта была успешно удалена
     */
    destroyMap(elementId: string, map?: any): boolean {
        try {
            // Проверяем, существует ли элемент карты на странице
            const mapElement = document.getElementById(elementId);
            if (!mapElement) {
                console.warn(`Элемент карты с ID ${elementId} не найден`);
                return false;
            }

            // Если передан объект карты, используем его для корректного удаления
            if (map) {
                if (typeof map.destroy === 'function') {
                    // Используем официальный метод destroy для Яндекс.Карт
                    map.destroy();
                    console.log(`Карта в элементе ${elementId} уничтожена`);
                } else {
                    console.warn('Объект карты не содержит метода destroy');

                    // Пробуем очистить другими методами
                    if (typeof map.geoObjects?.removeAll === 'function') {
                        map.geoObjects.removeAll();
                    }
                    if (typeof map.container?.fitToViewport === 'function') {
                        map.container.fitToViewport();
                    }
                }
            }

            // Очищаем содержимое элемента карты
            mapElement.innerHTML = '';

            return true;
        } catch (error) {
            console.error('Ошибка при удалении карты:', error);
            return false;
        }
    }

}
