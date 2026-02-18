import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Event } from '../models/event.model';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class OrganizerService {
    private eventsUrl = `${environment.apiUrl}/events`;

    constructor(private http: HttpClient) { }

    // Get statistics for organizer
    getOrganizerStatistics(): Observable<any> {
        // В текущем event-service нет отдельного /organizer/statistics.
        // Минимальная замена: агрегируем базовые метрики из /events/me/*.
        return this.http.get<{ count: number }>(`${this.eventsUrl}/me/participants/count`).pipe(
            map(count => ({ participantsCount: count.count })),
            catchError(error => throwError(() => error))
        );
    }

    // Get events created by the organizer
    getOrganizerEvents(): Observable<Event[]> {
        return this.http.get<any[]>(`${this.eventsUrl}/me/created`)
            .pipe(
                map(events => events.map(event => ({
                    ...event,
                    startDate: new Date(event.startDate),
                    endDate: new Date(event.endDate)
                }))),
                catchError(error => throwError(() => error))
            );
    }

    // Get upcoming events for organizer
    getUpcomingEvents(limit: number = 5): Observable<Event[]> {
        return throwError(() => new Error('upcoming-events endpoint is not available in event-service API'));
    }

    // Get recent feedbacks for organizer's events
    getRecentFeedbacks(limit: number = 5): Observable<any[]> {
        return throwError(() => new Error('recent-feedbacks endpoint is not available in event-service API'));
    }

    // Get participants for an event
    getEventParticipants(eventId: number): Observable<User[]> {
        console.log('getEventParticipants', eventId);

        return this.http.get<User[]>(`${this.eventsUrl}/${eventId}/participants`)
            .pipe(
                catchError(error => throwError(() => error))
            );
    }

    // Send email to event participants
    sendEmailToParticipants(emailData: any, id: number): Observable<any> {
        const message = [emailData?.subject, emailData?.message].filter(Boolean).join('\n\n');
        return this.http.post<any>(`${this.eventsUrl}/${id}/newsletter`, message, {
            headers: new HttpHeaders({ 'Content-Type': 'text/plain' })
        })
            .pipe(
                catchError(error => throwError(() => error))
            );
    }

    getCountRegisteredUsers(): Observable<{ count: number }> {
        return this.http.get<{ count: number }>(`${this.eventsUrl}/me/participants/count`)
            .pipe(
                catchError(error => {
                    console.error('Error getting registered users count:', error);
                    return throwError(() => error);
                })
            );
    }

    getAverageFeedbackRating(): Observable<{ score: number }> {
        return this.http.get<{ score: number }>(`${this.eventsUrl}/me/feedback/average-score`)
            .pipe(
                catchError(error => {
                    console.error('Error getting average feedback rating:', error);
                    return throwError(() => error);
                })
            );
    }
}
