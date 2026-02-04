import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (
    request: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const notificationService = inject(NotificationService);

    return next(request).pipe(
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'Произошла неизвестная ошибка';

            // Проверяем тип ошибки и получаем сообщение
            if (error.error instanceof ErrorEvent) {
                // Клиентская ошибка
                errorMessage = `Ошибка: ${error.error.message}`;
            } else {
                // Серверная ошибка
                if (error.error && error.error.error) {
                    errorMessage = error.error.error;
                } else if (error.error && typeof error.error === 'string') {
                    try {
                        const parsedError = JSON.parse(error.error);
                        if (parsedError.error) {
                            errorMessage = parsedError.error;
                        } else if (parsedError.message) {
                            errorMessage = parsedError.message;
                        }
                    } catch (e) {
                        errorMessage = error.error;
                    }
                } else {
                    switch (error.status) {
                        case 400:
                            errorMessage = 'Неверный запрос';
                            break;
                        case 401:
                            errorMessage = 'Необходима авторизация';
                            break;
                        case 403:
                            errorMessage = 'Доступ запрещен';
                            break;
                        case 404:
                            errorMessage = 'Ресурс не найден';
                            break;
                        case 500:
                            errorMessage = 'Внутренняя ошибка сервера';
                            break;
                        default:
                            errorMessage = `Ошибка: ${error.status}`;
                            break;
                    }
                }
            }

            // Показываем уведомление об ошибке
            notificationService.error(errorMessage);

            // Важно: пробрасываем исходный HttpErrorResponse, чтобы вызывающий код мог
            // корректно обработать status (например, 401 для логина).
            return throwError(() => error);
        })
    );
};
