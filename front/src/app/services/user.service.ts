import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private usersUrl = `${environment.apiUrl}/users`;
    private eventsUrl = `${environment.apiUrl}/events`;

    constructor(private http: HttpClient) { }

    getUser(id: number): Observable<User> {
        return this.http.get<User>(`${this.usersUrl}/${id}`);
    }

    getUserProfile(userId: number): Observable<any> {
        return this.http.get<any>(`${this.usersUrl}/${userId}`)
            .pipe(
                catchError(this.handleError)
            );
    }

    getUserByEmail(email: string): Observable<any> {
        const params = new HttpParams().set('email', email);

        return this.http.get<any>(`${this.usersUrl}`, { params })
            .pipe(
                catchError(this.handleError)
            );
    }

    updateUser(user: User): Observable<User> {
        // В новом API обновление профиля — только для текущего пользователя.
        // user-service принимает UserUpdateRequest и возвращает MessageResponse.
        // Чтобы не ломать существующие вызовы, оставляем сигнатуру и возвращаем user после успешного PATCH.
        return this.http.patch<any>(`${this.usersUrl}/me`, user).pipe(
            map(() => user),
            catchError(this.handleError)
        );
    }

    becomeOrganizer(user: User): Observable<any> {
        void user;
        return this.http.put<any>(`${this.usersUrl}/me/role`, null).pipe(
            catchError(this.handleError)
        );
    }

    updateUserProfile(profile: User): Observable<User> {
        return this.updateUser(profile);
    }

    updatePassword(currentPassword: string, newPassword: string): Observable<any> {
        void currentPassword;
        void newPassword;
        return throwError(() => new Error('update-password endpoint is not available in current backend API'));
    }

    deleteAccount(): Observable<any> {
        return throwError(() => new Error('delete account endpoint is not available in current backend API'));
    }

    // Get user events - the events a user has registered for
    getUserEvents(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.eventsUrl}/users/${userId}/participated`)
            .pipe(
                catchError(this.handleError)
            );
    }

    // Get user tickets
    getUserTickets(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.eventsUrl}/users/${userId}/participated`)
            .pipe(
                catchError(this.handleError)
            );
    }

    // Добавление нового метода в сервис UserService

    /**
     * Request to become an organizer
     */
    requestOrganizerRole(): Observable<any> {
        return this.http.put<any>(`${this.usersUrl}/me/role`, null)
            .pipe(
                catchError(this.handleError)
            );
    }

    // Update ticket status
    updateTicketStatus(ticketId: number, status: string): Observable<any> {
        void ticketId;
        void status;
        return throwError(() => new Error('tickets endpoint is not available in current backend API'));
    }

    // Generate ticket PDF
    generateTicketPDF(ticketId: number): Observable<Blob> {
        void ticketId;
        return throwError(() => new Error('tickets endpoint is not available in current backend API'));
    }

    // Улучшенная обработка ошибок
    private handleError(error: HttpErrorResponse) {
        console.error('API Error:', error);

        let errorMessage = 'Произошла неизвестная ошибка';
        if (error.error instanceof ErrorEvent) {
            // Клиентская ошибка
            errorMessage = `Ошибка: ${error.error.message}`;
        } else {
            // Серверная ошибка
            switch (error.status) {
                case 403:
                    errorMessage = 'Доступ запрещен. У вас недостаточно прав для этого действия.';
                    break;
                case 401:
                    errorMessage = 'Требуется авторизация. Пожалуйста, войдите в систему снова.';
                    break;
                case 404:
                    errorMessage = 'Запрашиваемый ресурс не найден.';
                    break;
                default:
                    if (error.error && typeof error.error === 'object' && error.error.error) {
                        errorMessage = error.error.error;
                    } else if (error.error && typeof error.error === 'string') {
                        try {
                            const parsedError = JSON.parse(error.error);
                            errorMessage = parsedError.error || parsedError.message || errorMessage;
                        } catch (e) {
                            errorMessage = error.error;
                        }
                    }
            }
        }

        return throwError(() => new Error(errorMessage));
    }

    // Другие методы для работы с пользователями...
}
