import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const tokenInterceptor: HttpInterceptorFn = (
    request: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    // Инжектируем сервисы
    const authService = inject(AuthService);
    const router = inject(Router);
    const tokenKey = 'auth_token';

    // Получаем токен из локального хранилища
    const token = localStorage.getItem(tokenKey);

    // Если токен существует и запрос не содержит заголовок Authorization
    if (token && !request.headers.has('Authorization')) {
        // Клонируем запрос и добавляем токен в заголовки
        request = request.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    // Обрабатываем ответ
    return next(request).pipe(
        catchError((error: HttpErrorResponse) => {
            // Если ошибка 401 Unauthorized, выполняем выход
            if (error.status === 401) {
                authService.logout();
                router.navigate(['/login']);
            }
            return throwError(() => error);
        })
    );
};
