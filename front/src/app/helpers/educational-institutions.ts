/**
 * Данные известных вузов Санкт-Петербурга для упрощения поиска
 */
export interface EducationalInstitution {
    id: string;          // Уникальный идентификатор
    shortName: string;   // Сокращенное название (аббревиатура)
    fullName: string;    // Полное название
    address: string;     // Адрес главного корпуса
    coordinates: {       // Координаты главного корпуса
        lat: number;
        lng: number;
    };
    aliases: string[];   // Альтернативные названия и аббревиатуры для поиска
}

export const SAINT_PETERSBURG_UNIVERSITIES: EducationalInstitution[] = [
    {
        id: "itmo",
        shortName: "ИТМО",
        fullName: "Национальный исследовательский университет ИТМО",
        address: "Россия, Санкт-Петербург, Кронверкский проспект, 49",
        coordinates: { lat: 59.957184, lng: 30.308336 },
        aliases: ["ИТМО", "Университет ИТМО", "ITMO", "ITMO University"]
    },
    {
        id: "spbsu",
        shortName: "СПбГУ",
        fullName: "Санкт-Петербургский государственный университет",
        address: "Россия, Санкт-Петербург, Университетская набережная, 7/9",
        coordinates: { lat: 59.941147, lng: 30.299520 },
        aliases: ["СПбГУ", "Государственный университет", "СПГУ", "Спбгу", "SPBU"]
    },
    {
        id: "spbpu",
        shortName: "СПбПУ",
        fullName: "Санкт-Петербургский политехнический университет Петра Великого",
        address: "Россия, Санкт-Петербург, Политехническая улица, 29",
        coordinates: { lat: 60.007801, lng: 30.372703 },
        aliases: ["СПбПУ", "Политех", "Политехнический", "Политехнический университет", "Политех Петра"]
    },
    {
        id: "spbetu",
        shortName: "СПбГЭТУ ЛЭТИ",
        fullName: "Санкт-Петербургский государственный электротехнический университет ЛЭТИ",
        address: "Россия, Санкт-Петербург, улица Профессора Попова, 5",
        coordinates: { lat: 59.971251, lng: 30.318073 },
        aliases: ["ЛЭТИ", "СПбГЭТУ", "Электротехнический университет", "ЛЕТИ", "СПБГЭТУ"]
    },
    {
        id: "spbgut",
        shortName: "СПбГУТ",
        fullName: "Санкт-Петербургский государственный университет телекоммуникаций им. проф. М.А.Бонч-Бруевича",
        address: "Россия, Санкт-Петербург, проспект Большевиков, 22к1",
        coordinates: { lat: 59.912804, lng: 30.415736 },
        aliases: ["СПБГУТ", "Бонч", "Бонча", "СПбГУТ", "Университет телекоммуникаций"]
    }
];

/**
 * Поиск информации о вузе по запросу (названию, аббревиатуре)
 * @param query Запрос для поиска
 * @returns Найденный вуз или null
 */
export function findUniversity(query: string): EducationalInstitution | null {
    if (!query || query.trim().length < 2) {
        return null;
    }

    const normalizedQuery = query.toLowerCase().trim();

    return SAINT_PETERSBURG_UNIVERSITIES.find(uni =>
        uni.shortName.toLowerCase() === normalizedQuery ||
        uni.fullName.toLowerCase().includes(normalizedQuery) ||
        uni.aliases.some(alias => normalizedQuery.includes(alias.toLowerCase()))
    ) || null;
}
