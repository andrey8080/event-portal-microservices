import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Feedback {
    id: number;
    eventId: number;
    userId: number;
    userName: string;
    rating: number;
    comment: string;
    createdAt: Date;
}

@Injectable({
    providedIn: 'root'
})
export class FeedbackService {
    private eventUrl = `${environment.apiUrl}/events`;
    private tokenKey = 'auth_token';

    constructor(private http: HttpClient, private authService: AuthService) { }

    submitFeedback(eventId: number, rating: number, comment: string): Observable<any> {
        return this.http.post<any>(`${this.eventUrl}/${eventId}/feedback`, { rating, comment })
            .pipe(
                catchError(error => throwError(() => error))
            );
    }

    getEventFeedbacks(eventId: number): Observable<Feedback[]> {
        return this.http.get<string[]>(`${this.eventUrl}/${eventId}/feedback`)
            .pipe(
                map(feedbacks => {
                    console.log('Raw feedbacks data:', feedbacks);

                    if (!feedbacks || feedbacks.length === 0) {
                        return [];
                    }

                    return feedbacks.map((feedbackStr, index) => {
                        try {
                            // Ожидаем формат "userId:userName:rating:comment"
                            const parts = feedbackStr.split(':');

                            if (parts.length >= 4) {
                                const userId = parseInt(parts[0], 10);
                                const userName = parts[1];
                                const rating = parseInt(parts[2], 10);
                                // Объединяем оставшиеся части обратно, на случай если в комментарии есть двоеточия
                                const comment = parts.slice(3).join(':');

                                return {
                                    id: index + 1,
                                    eventId: eventId,
                                    userId: userId,
                                    userName: userName,
                                    rating: rating,
                                    comment: comment,
                                    createdAt: new Date()
                                };
                            } else {
                                console.error('Invalid feedback format:', feedbackStr);
                                return null;
                            }
                        } catch (e) {
                            console.error('Error parsing feedback:', e, feedbackStr);
                            return null;
                        }
                    }).filter(feedback => feedback !== null) as Feedback[];
                }),
                catchError(error => {
                    console.error('Error getting feedbacks:', error);
                    return throwError(() => error);
                })
            );
    }

    getUserFeedbacks(userId: number): Observable<Feedback[]> {
        return throwError(() => new Error('getUserFeedbacks endpoint is not available in event-service API'));
    }

    deleteFeedback(eventId: number, feedbackId: number): Observable<any> {
        return this.http.delete<any>(`${this.eventUrl}/${eventId}/feedback/${feedbackId}`)
            .pipe(
                catchError(error => throwError(() => error))
            );
    }
}
