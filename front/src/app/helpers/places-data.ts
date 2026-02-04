/**
 * Данные известных адресов и мест Санкт-Петербурга для резервного поиска
 * при отказе API и коррекции опечаток
 */
export interface KnownPlace {
    query: string;          // Строка запроса для сопоставления
    name: string;           // Название места
    address: string;        // Полный адрес
    coordinates: {          // Координаты
        lat: number;
        lng: number;
    };
    type?: string;          // Тип места
    variants?: string[];    // Варианты написания, опечатки
}

export const SAINT_PETERSBURG_PLACES: KnownPlace[] = [
    {
        query: "невский проспект",
        name: "Невский проспект",
        address: "Россия, Санкт-Петербург, Невский проспект",
        coordinates: { lat: 59.932732, lng: 30.348206 },
        type: "Улица",
        variants: ["невский", "невский пр", "невский пр."]
    },
    {
        query: "невский 8",
        name: "Невский проспект, 8",
        address: "Россия, Санкт-Петербург, Невский проспект, 8",
        coordinates: { lat: 59.936500, lng: 30.315972 },
        type: "Здание"
    },
    {
        query: "дворцовая площадь",
        name: "Дворцовая площадь",
        address: "Россия, Санкт-Петербург, Дворцовая площадь",
        coordinates: { lat: 59.939864, lng: 30.315538 },
        type: "Площадь",
        variants: ["дворцовая"]
    },
    {
        query: "адмиралтейство",
        name: "Адмиралтейство",
        address: "Россия, Санкт-Петербург, Адмиралтейский проспект, 1",
        coordinates: { lat: 59.937755, lng: 30.308077 },
        type: "Достопримечательность"
    },
    {
        query: "петропавловская крепость",
        name: "Петропавловская крепость",
        address: "Россия, Санкт-Петербург, Петропавловская крепость",
        coordinates: { lat: 59.950016, lng: 30.316705 },
        type: "Достопримечательность",
        variants: ["петропавловка"]
    },
    // Добавляем ИТМО
    {
        query: "кронверкский проспект 49",
        name: "Кронверкский проспект, 49",
        address: "Россия, Санкт-Петербург, Кронверкский проспект, 49",
        coordinates: { lat: 59.957184, lng: 30.308336 },
        type: "Здание",
        variants: ["кронверский 49", "кронверкский 49", "итмо кронверкский", "итмо главный корпус"]
    },
    {
        query: "ломоносова 9",
        name: "Улица Ломоносова, 9",
        address: "Россия, Санкт-Петербург, улица Ломоносова, 9",
        coordinates: { lat: 59.927288, lng: 30.338353 },
        type: "Здание",
        variants: ["ломо итмо", "итмо ломоносова"]
    },
    {
        query: "биржевая 4",
        name: "Биржевая линия, 4",
        address: "Россия, Санкт-Петербург, Биржевая линия, 4",
        coordinates: { lat: 59.944155, lng: 30.304217 },
        type: "Здание",
        variants: ["итмо биржевая", "биржевая линия 4"]
    },
    // Другие известные места
    {
        query: "казанский собор",
        name: "Казанский кафедральный собор",
        address: "Россия, Санкт-Петербург, Казанская площадь, 2",
        coordinates: { lat: 59.934252, lng: 30.324547 },
        type: "Достопримечательность"
    },
    {
        query: "исаакиевский собор",
        name: "Исаакиевский собор",
        address: "Россия, Санкт-Петербург, Исаакиевская площадь, 4",
        coordinates: { lat: 59.934048, lng: 30.305851 },
        type: "Достопримечательность",
        variants: ["исакиевский", "исаакий"]
    },
    {
        query: "смольный",
        name: "Смольный дворец",
        address: "Россия, Санкт-Петербург, площадь Растрелли, 1",
        coordinates: { lat: 59.946522, lng: 30.394337 },
        type: "Достопримечательность"
    },
    {
        query: "московский вокзал",
        name: "Московский вокзал",
        address: "Россия, Санкт-Петербург, Невский проспект, 85",
        coordinates: { lat: 59.929832, lng: 30.361834 },
        type: "Транспорт"
    }
];

/**
 * Таблица исправления опечаток в названиях улиц
 */
const MISSPELLING_CORRECTIONS: Record<string, string> = {
    "кронверский": "кронверкский",
    "конверкский": "кронверкский",
    "исакиевский": "исаакиевский",
    "лаврский": "лавра",
    "петроградка": "петроградская",
    "петропавлоская": "петропавловская",
    "дворцоая": "дворцовая",
    "инженерый": "инженерная",
    "каменостровский": "каменноостровский",
};

/**
 * Очистка и нормализация поискового запроса
 */
function normalizeQuery(query: string): string {
    return query.toLowerCase()
        .replace(/ё/g, 'е')                     // Замена ё на е
        .replace(/\s+/g, ' ')                   // Нормализация пробелов
        .replace(/[,.;:'"«»]/g, '')             // Удаление пунктуации
        .replace(/проспект/g, 'пр')             // Сокращение "проспект" до "пр"
        .replace(/улица/g, 'ул')                // Сокращение "улица" до "ул"
        .replace(/санкт[\-\s]?петербург/g, '')  // Удаление упоминания города
        .replace(/спб/g, '')                    // Удаление сокращения города
        .trim();
}

/**
 * Исправление распространенных опечаток в адресе
 */
function correctMisspellings(query: string): string {
    const words = query.split(' ');
    return words.map(word => {
        const correction = MISSPELLING_CORRECTIONS[word];
        return correction || word;
    }).join(' ');
}

/**
 * Поиск информации о месте по запросу с улучшенной адаптивностью
 * @param query Запрос для поиска
 * @returns Найденное место или null
 */
export function findKnownPlace(query: string): KnownPlace | null {
    if (!query || query.trim().length < 2) {
        return null;
    }

    // Предварительная обработка запроса
    let normalizedQuery = normalizeQuery(query);
    normalizedQuery = correctMisspellings(normalizedQuery);

    // Сначала ищем точное совпадение по основному запросу
    const exactMatch = SAINT_PETERSBURG_PLACES.find(place =>
        normalizeQuery(place.query) === normalizedQuery ||
        normalizeQuery(place.name.toLowerCase()) === normalizedQuery
    );

    if (exactMatch) {
        return exactMatch;
    }

    // Проверяем совпадение по вариантам написания
    const variantMatch = SAINT_PETERSBURG_PLACES.find(place =>
        place.variants && place.variants.some(variant =>
            normalizeQuery(variant) === normalizedQuery ||
            normalizedQuery.includes(normalizeQuery(variant))
        )
    );

    if (variantMatch) {
        return variantMatch;
    }

    // Проверяем, содержит ли запрос улицу и номер дома
    const streetNumberMatch = matchStreetAndNumber(normalizedQuery);
    if (streetNumberMatch) {
        return streetNumberMatch;
    }

    // Проверяем частичное совпадение (для более общих запросов)
    return SAINT_PETERSBURG_PLACES.find(place => {
        const placeQuery = normalizeQuery(place.query);
        return normalizedQuery.includes(placeQuery) || placeQuery.includes(normalizedQuery);
    }) || null;
}

/**
 * Выделение из запроса названия улицы и номера дома
 */
function matchStreetAndNumber(query: string): KnownPlace | null {
    // Регулярное выражение для поиска названия улицы и номера дома
    const streetMatch = query.match(/([а-яё]+\s*[а-яё]+)\s+(\d+)/i);

    if (streetMatch) {
        const street = streetMatch[1].toLowerCase();
        const number = streetMatch[2];

        // Ищем совпадения по названию улицы + номер дома
        return SAINT_PETERSBURG_PLACES.find(place => {
            const placeQuery = normalizeQuery(place.query);
            return placeQuery.includes(street) && placeQuery.includes(number);
        }) || null;
    }

    return null;
}
