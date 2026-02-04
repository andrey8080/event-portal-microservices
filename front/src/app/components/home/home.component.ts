import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EventService } from '../../services/event.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { Event } from '../../models/event.model';
import { User } from '../../models/user.model';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule]
})
export class HomeComponent implements OnInit, OnDestroy {
    featuredEvents: Event[] = [];
    isLoading = true;
    newsletterEmail = '';

    // Auth related properties
    isAuthenticated = false;
    isOrganizer = false;
    isAdmin = false;
    currentUser: User | null = null;

    private userSubscription: Subscription | null = null;

    // categories = [
    //     { id: 1, name: 'Музыка', icon: 'music-note', count: 42 },
    //     { id: 2, name: 'Спорт', icon: 'activity', count: 38 },
    //     { id: 3, name: 'Технологии', icon: 'laptop', count: 31 },
    //     { id: 4, name: 'Искусство', icon: 'palette', count: 25 },
    //     { id: 5, name: 'Кулинария', icon: 'egg-fried', count: 19 },
    //     { id: 6, name: 'Образование', icon: 'book', count: 22 },
    //     { id: 7, name: 'Развлечения', icon: 'film', count: 28 },
    //     { id: 8, name: 'Бизнес', icon: 'briefcase', count: 17 }
    // ];


    constructor(
        private eventService: EventService,
        private authService: AuthService,
        private userService: UserService
    ) { }

    ngOnInit(): void {
        this.loadFeaturedEvents();

        // Subscribe to auth changes
        this.userSubscription = this.authService.currentUser$.subscribe(user => {
            this.currentUser = user;
            this.isAuthenticated = !!user;
            this.isOrganizer = this.authService.isOrganizer();
            this.isAdmin = this.authService.isAdmin();
        });
    }

    ngOnDestroy(): void {
        if (this.userSubscription) {
            this.userSubscription.unsubscribe();
        }
    }

    loadFeaturedEvents(): void {
        this.isLoading = true;

        this.eventService.getEvents().subscribe({
            next: (events) => {
                // Sort by date and get upcoming events
                const sortedEvents = events
                    .filter(event => new Date(event.startDate) > new Date()) // Only upcoming events
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

                // Get first 6 events
                this.featuredEvents = sortedEvents.slice(0, 6);
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading featured events:', err);
                this.isLoading = false;
            }
        });
    }

    becomeOrganizer(): void {
        if (!this.isAuthenticated) {
            return;
        }

        // Request to become an organizer
        this.userService.requestOrganizerRole().subscribe({
            next: () => {
                alert('Ваш запрос на роль организатора отправлен и будет рассмотрен администратором.');
            },
            error: (err) => {
                console.error('Error requesting organizer role:', err);
                alert('Произошла ошибка при отправке запроса.');
            }
        });
    }

    private validateEmail(email: string): boolean {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
}
