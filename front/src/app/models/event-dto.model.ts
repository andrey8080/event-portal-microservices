import { Event } from './event.model';

// Модель для передачи данных о событии в соответствии с бэкендом
export interface EventDTO {
    id: number;
    title: string;
    description: string;
    startDate: string; // ISO строка для даты
    endDate: string; // ISO строка для даты
    address: string;
    latitude: number;
    longitude: number;
    organizerId: number;
    organizerName: string;
    price: number;
    maxParticipants: number;
    registeredParticipants: number;
    hasQuiz: boolean;
    images?: string[];
    eventCategory?: string;
    category?: string;
    location?: string;
    capacity?: number;
    registeredAttendees?: number;
    status?: string;
    tags?: string[];
}

/**
 * Преобразует объект Event в EventDTO для отправки на сервер
 */
export function eventToDTO(event: Event): EventDTO {
    return {
        id: event.id,
        title: event.title,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        address: event.location.address,
        latitude: event.location.latitude ?? 0,
        longitude: event.location.longitude ?? 0,
        organizerId: event.organizerId,
        organizerName: event.organizerName,
        price: event.price,
        maxParticipants: event.maxParticipants,
        registeredParticipants: event.registeredParticipants,
        hasQuiz: event.hasQuiz,
        images: event.images
    };
}

/**
 * Преобразует объект EventDTO, полученный с сервера, в Event
 */
export function dtoToEvent(dto: EventDTO): Event {
    return {
        id: dto.id,
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
        location: {
            address: dto.address || '',
            latitude: dto.latitude ?? undefined,
            longitude: dto.longitude ?? undefined
        },
        organizerId: dto.organizerId,
        organizerName: dto.organizerName,
        price: dto.price,
        maxParticipants: dto.maxParticipants || 0,
        registeredParticipants: dto.registeredParticipants || 0,
        hasQuiz: dto.hasQuiz || false,
        images: dto.images || [],
        eventCategory: dto.eventCategory || dto.category || '',
        capacity: dto.capacity || 0,
        registeredAttendees: dto.registeredAttendees || 0,
        status: dto.status || '',
        tags: dto.tags || []
    };
}

export function mapEventDtoToEvent(dto: EventDTO): Event {
    return {
        id: dto.id,
        title: dto.title,
        description: dto.description,
        address: dto.address,
        organizerId: dto.organizerId,
        organizerName: dto.organizerName,
        eventCategory: dto.eventCategory || dto.category || '',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        price: dto.price,
        location: {
            address: dto.address,
            latitude: dto.latitude,
            longitude: dto.longitude
        },
        capacity: dto.capacity,
        registeredAttendees: dto.registeredAttendees,
        status: dto.status,
        images: dto.images || [],
        tags: dto.tags || [],
        maxParticipants: dto.maxParticipants || 0,
        registeredParticipants: dto.registeredParticipants || 0,
        hasQuiz: dto.hasQuiz || false
    };
}
