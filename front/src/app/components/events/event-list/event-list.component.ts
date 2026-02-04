import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EventService } from '../../../services/event.service';
import { Event } from '../../../models/event.model';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-event-list',
    templateUrl: './event-list.component.html',
    // styleUrls: ['./event-list.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule]
})
export class EventListComponent implements OnInit {
    events: Event[] = [];
    filteredEvents: Event[] = [];
    loading = true;
    error = '';
    isOrganizer: boolean = false; // Добавлено свойство isOrganizer

    // Фильтры
    searchQuery: string = '';
    selectedCategory: string = '';
    sortBy: string = 'date';

    // Категории для фильтрации
    categories = [
        { id: '', name: 'Все категории' },
        { id: 'music', name: 'Музыка' },
        { id: 'sports', name: 'Спорт' },
        { id: 'tech', name: 'Технологии' },
        { id: 'art', name: 'Искусство' },
        { id: 'food', name: 'Кулинария' },
        { id: 'education', name: 'Образование' }
    ];

    constructor(
        private eventService: EventService,
        private router: Router,
        private authService: AuthService // Добавлен сервис авторизации
    ) { }

    ngOnInit(): void {
        this.loadEvents();
        // Проверяем, является ли пользователь организатором
        this.isOrganizer = this.authService.isOrganizer();
    }

    loadEvents(): void {
        this.loading = true;
        this.eventService.getEvents().subscribe({
            next: (events) => {
                this.events = events;
                this.filteredEvents = [...events];
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading events:', err);
                this.error = 'Ошибка при загрузке событий';
                this.loading = false;
            }
        });
    }

    applyFilters(): void {
        this.filteredEvents = this.events.filter(event => {
            // Поиск по названию и описанию
            const matchesSearch = this.searchQuery ?
                (event.title?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                    event.description?.toLowerCase().includes(this.searchQuery.toLowerCase())) :
                true;

            // Фильтр по категории
            const matchesCategory = this.selectedCategory ?
                event.eventCategory === this.selectedCategory :
                true;

            return matchesSearch && matchesCategory;
        });

        // Сортировка
        if (this.sortBy === 'date') {
            this.filteredEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        } else if (this.sortBy === 'price') {
            this.filteredEvents.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (this.sortBy === 'popularity') {
            this.filteredEvents.sort((a, b) => (b.registeredParticipants || 0) - (a.registeredParticipants || 0));
        }
    }

    resetFilters(): void {
        this.searchQuery = '';
        this.selectedCategory = '';
        this.sortBy = 'date';
        this.filteredEvents = [...this.events];
    }
}
