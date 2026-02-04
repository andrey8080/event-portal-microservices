import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User, UserRole } from '../models/user.model';
import { Event } from '../models/event.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private eventsUrl = `${environment.apiUrl}/events`;

    constructor(private http: HttpClient) { }

    // Dashboard statistics
    getStatistics(): Observable<any> {
        // Отдельного admin/statistics API сейчас нет. Делаем минимальную статистику из общего списка событий.
        return this.http.get<Event[]>(`${this.eventsUrl}`).pipe(
            map(events => {
                const now = new Date();
                const mapped = (events ?? []).map(e => ({
                    ...e,
                    startDate: new Date((e as any).startDate),
                    endDate: new Date((e as any).endDate)
                }));

                const upcoming = mapped.filter(e => e.startDate instanceof Date && !isNaN(e.startDate.getTime()) && e.startDate > now);
                return {
                    eventsTotal: mapped.length,
                    upcomingEvents: upcoming.length
                };
            }),
            catchError(error => throwError(() => error))
        );
    }

    getLatestUsers(limit: number = 5): Observable<User[]> {
        void limit;
        return throwError(() => new Error('latest-users endpoint is not available in current backend API'));
    }

    getUpcomingEvents(limit: number = 5): Observable<Event[]> {
        return this.http.get<Event[]>(`${this.eventsUrl}`).pipe(
            map(events => {
                const now = new Date();
                return (events ?? [])
                    .map(event => ({
                        ...event,
                        startDate: new Date((event as any).startDate),
                        endDate: new Date((event as any).endDate)
                    }))
                    .filter(event => event.startDate instanceof Date && !isNaN(event.startDate.getTime()) && event.startDate > now)
                    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
                    .slice(0, limit);
            }),
            catchError(error => throwError(() => error))
        );
    }

    // User management
    getAllUsers(): Observable<User[]> {
        return throwError(() => new Error('admin users listing is not available in current backend API'));
    }

    createUser(userData: any): Observable<User> {
        void userData;
        return throwError(() => new Error('admin create user is not available in current backend API'));
    }

    updateUser(userData: any): Observable<User> {
        void userData;
        return throwError(() => new Error('admin update user is not available in current backend API'));
    }

    updateUserRole(userId: number, role: UserRole): Observable<any> {
        void userId;
        void role;
        return throwError(() => new Error('admin update user role is not available in current backend API'));
    }

    deleteUser(userId: number): Observable<any> {
        void userId;
        return throwError(() => new Error('admin delete user is not available in current backend API'));
    }

    // Reports
    downloadReport(reportType: string): Observable<any> {
        void reportType;
        return throwError(() => new Error('admin reports are not available in current backend API'));
    }
}
