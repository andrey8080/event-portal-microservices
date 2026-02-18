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
            const url = request.url || '';
            const isGeoLookup = /\/geo\/(geocode|search)(\/biz)?(\?|$)/.test(url);
            const path = (() => {
                try {
                    return new URL(url).pathname;
                } catch {
                    return url;
                }
            })();

            const errorMessage = notificationService.parseHttpError(
                error,
                `Ошибка запроса ${request.method} ${path}`
            );

            // Для геокодинга/поиска адресов не показываем тосты на каждую ошибку.
            // Эти запросы могут падать из-за ключей/ограничений и часто обрабатываются фолбэком.
            if (!isGeoLookup) {
                notificationService.error(errorMessage);
            } else {
                // Оставляем след в консоли для отладки.
                console.warn('Geo lookup request failed:', { url, status: error.status, error });
            }

            // Важно: пробрасываем исходный HttpErrorResponse, чтобы вызывающий код мог
            // корректно обработать status (например, 401 для логина).
            return throwError(() => error);
        })
    );
};
