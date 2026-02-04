import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../../services/notification.service';

@Component({
    selector: 'app-notification',
    templateUrl: './notification.component.html',
    styleUrls: ['./notification.component.scss'],
    standalone: true,
    imports: [CommonModule]
})
export class NotificationComponent implements OnInit, OnDestroy {
    notifications: Notification[] = [];
    private subscription: Subscription | null = null;

    constructor(private notificationService: NotificationService) { }

    ngOnInit(): void {
        this.subscription = this.notificationService.notifications$.subscribe(notifications => {
            this.notifications = notifications;
        });
    }

    ngOnDestroy(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    close(id: number): void {
        this.notificationService.close(id);
    }

    getIcon(type: string): string {
        switch (type) {
            case 'success':
                return 'bi-check-circle-fill';
            case 'info':
                return 'bi-info-circle-fill';
            case 'warning':
                return 'bi-exclamation-triangle-fill';
            case 'error':
                return 'bi-x-circle-fill';
            default:
                return 'bi-bell-fill';
        }
    }

    getBgColor(type: string): string {
        switch (type) {
            case 'success':
                return 'bg-success';
            case 'info':
                return 'bg-info';
            case 'warning':
                return 'bg-warning';
            case 'error':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    }
}
