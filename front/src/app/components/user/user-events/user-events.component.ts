import { Component, OnInit } from '@angular/core';

interface Event {
    id: number;
    title: string;
    date: string;
    location: string;
    imageUrl?: string;
    status: 'upcoming' | 'past';
}

interface Ticket {
    id: number;
    eventId: number;
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    ticketNumber: string;
    price: number;
    purchaseDate: string;
}

@Component({
    selector: 'app-user-events',
    templateUrl: './user-events.component.html',
    // styleUrls: ['./user-events.component.scss']
})
export class UserEventsComponent implements OnInit {
    // События, созданные пользователем (если он организатор)
    createdEvents: Event[] = [];
    // События, на которые пользователь купил билеты
    tickets: Ticket[] = [];
    loading = true;
    error = '';
    activeTab: 'created' | 'tickets' = 'tickets';

    constructor() { }

    ngOnInit(): void {
        this.loadUserEvents();
    }

    loadUserEvents(): void {
        // Имитация загрузки данных с сервера
        setTimeout(() => {
            this.tickets = [
                {
                    id: 1,
                    eventId: 101,
                    eventTitle: 'Музыкальный фестиваль',
                    eventDate: '2023-10-15',
                    eventLocation: 'Москва, Парк Горького',
                    ticketNumber: 'T-123456',
                    price: 1500,
                    purchaseDate: '2023-09-01'
                },
                {
                    id: 2,
                    eventId: 102,
                    eventTitle: 'Конференция по IT',
                    eventDate: '2023-11-20',
                    eventLocation: 'Санкт-Петербург, Экспофорум',
                    ticketNumber: 'T-789012',
                    price: 3000,
                    purchaseDate: '2023-09-05'
                }
            ];

            this.createdEvents = [
                {
                    id: 201,
                    title: 'Мастер-класс по живописи',
                    date: '2023-12-05',
                    location: 'Москва, ул. Пушкинская, 10',
                    status: 'upcoming'
                },
                {
                    id: 202,
                    title: 'Встреча книжного клуба',
                    date: '2023-09-10',
                    location: 'Москва, ул. Тверская, 5',
                    status: 'past'
                }
            ];

            this.loading = false;
        }, 1000);
    }

    setActiveTab(tab: 'created' | 'tickets'): void {
        this.activeTab = tab;
    }
}
