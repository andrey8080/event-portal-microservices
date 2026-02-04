import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private tokenKey = 'auth_token';

    constructor() { }

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        // Добавляем токен авторизации ко всем запросам, если он есть
        const token = localStorage.getItem(this.tokenKey);

        if (token) {
            // Проверяем, не содержит ли запрос уже заголовок Authorization
            if (!request.headers.has('Authorization')) {
                request = request.clone({
                    setHeaders: {
                        Authorization: token
                    }
                });
            }
        }

        return next.handle(request);
    }
}
