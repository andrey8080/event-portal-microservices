import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class AuthHeaderService {
    private tokenKey = 'auth_token';

    constructor() { }

    /**
     * Получение HTTP-заголовков с корректным токеном авторизации
     */
    getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) {
            return new HttpHeaders();
        }

        // Обеспечиваем наличие пробела между 'Bearer' и токеном
        return new HttpHeaders().set('Authorization', `Bearer ${token}`);
    }

    /**
     * Проверяет, есть ли валидный токен авторизации
     */
    hasValidToken(): boolean {
        const token = localStorage.getItem(this.tokenKey);
        return !!token;
    }
}
