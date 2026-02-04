export interface Event {
    id: number;
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    location: {
        address: string;
        latitude?: number;
        longitude?: number;
    };
    organizerId: number;
    organizerName: string;
    price: number;
    maxParticipants: number;
    registeredParticipants: number;
    hasQuiz: boolean;
    images: string[];
    eventCategory: string;
    category?: string; // Для обратной совместимости
    // Дополнительные поля, упоминаемые в событиях об ошибках
    address?: string;
    capacity?: number;
    registeredAttendees?: number;
    status?: string;
    tags?: string[];
}
