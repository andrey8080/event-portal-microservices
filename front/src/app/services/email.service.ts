import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface EmailTemplate {
    id: number;
    name: string;
    subject: string;
    body: string;
}

@Injectable({
    providedIn: 'root'
})
export class EmailService {
    // Предполагается, что нужно добавить контроллер для работы с email на бэкенде
    private apiUrl = `${environment.apiUrl}/email`;
    private tokenKey = 'auth_token';

    constructor(private http: HttpClient) { }

    sendEmail(to: string | string[], subject: string, body: string): Observable<any> {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) {
            return throwError(() => new Error('Not authenticated'));
        }

        let headers = new HttpHeaders().set('Authorization', token);
        const emailData = {
            to: Array.isArray(to) ? to.join(',') : to,
            subject,
            body
        };

        return this.http.post<any>(`${this.apiUrl}/send`, emailData, { headers })
            .pipe(
                catchError(error => throwError(() => error))
            );
    }

    sendEventNotification(eventId: number, subject: string, message: string): Observable<any> {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) {
            return throwError(() => new Error('Not authenticated'));
        }

        let headers = new HttpHeaders().set('Authorization', token);
        let params = new HttpParams()
            .set('eventId', eventId)
            .set('subject', subject)
            .set('message', message);

        return this.http.post<any>(`${this.apiUrl}/event-notification`, null, { params, headers })
            .pipe(
                catchError(error => throwError(() => error))
            );
    }

    getEmailTemplates(): Observable<EmailTemplate[]> {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) {
            return throwError(() => new Error('Not authenticated'));
        }

        let headers = new HttpHeaders().set('Authorization', token);

        return this.http.get<EmailTemplate[]>(`${this.apiUrl}/templates`, { headers })
            .pipe(
                catchError(error => throwError(() => error))
            );
    }

    createEmailTemplate(template: EmailTemplate): Observable<EmailTemplate> {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) {
            return throwError(() => new Error('Not authenticated'));
        }

        let headers = new HttpHeaders().set('Authorization', token);

        return this.http.post<EmailTemplate>(`${this.apiUrl}/templates`, template, { headers })
            .pipe(
                catchError(error => throwError(() => error))
            );
    }
}
