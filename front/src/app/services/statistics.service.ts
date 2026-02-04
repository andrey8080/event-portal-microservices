import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface EventStatistics {
    eventId: number;
    totalRegistered: number;
    totalAttended: number;
    quizParticipation: number;
    genderDistribution: {
        male: number;
        female: number;
        other: number;
    };
    ageDistribution: {
        under18: number;
        age18to24: number;
        age25to34: number;
        age35to44: number;
        age45plus: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class StatisticsService {
    // Примечание: отсутствует соответствующий endpoint на бэкенде
    // На бэкенде нужно добавить контроллер для статистики
    private apiUrl = `${environment.apiUrl}/statistics`;
    private tokenKey = 'auth_token';

    constructor(private http: HttpClient) { }

    getEventStatistics(eventId: number): Observable<EventStatistics> {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) {
            return throwError(() => new Error('Not authenticated'));
        }

        let params = new HttpParams().set('eventId', eventId);

        return this.http.get<EventStatistics>(`${this.apiUrl}/event`, {
            headers: { 'Authorization': token },
            params: params
        }).pipe(
            catchError(error => throwError(() => error))
        );
    }

    // Метод для отправки данных аналитики в Яндекс.Метрику
    sendAnalyticsEvent(eventName: string, eventData: any): void {
        // В реальном приложении здесь будет вызов Яндекс.Метрики API
        if (typeof window !== 'undefined' && (window as any).ym) {
            try {
                (window as any).ym(123456, 'reachGoal', eventName, eventData);
            } catch (e) {
                console.error('Error sending analytics data:', e);
            }
        }
    }
}
