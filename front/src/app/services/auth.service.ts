import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { User, UserRole } from '../models/user.model';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

interface AuthResponse {
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authUrl = `${environment.apiUrl}/auth`;
  private usersUrl = `${environment.apiUrl}/users`;
  private tokenKey = 'auth_token';
  private userKey = 'current_user';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadCurrentUser();

    // При загрузке сервиса проверяем валидность токена и обновляем информацию о пользователе
    if (this.isAuthenticated()) {
      this.verifyToken().subscribe({
        next: (response) => {
          // Если токен валидный, обновляем информацию о пользователе из хранилища 
          // и запрашиваем актуальные данные с сервера
          const user = this.getCurrentUser();
          if (user && user.email) {
            this.getUserInfo(user.email).subscribe();
          }
        },
        error: () => this.logout() // Если токен невалидный, выполняем выход
      });
    }
  }

  private loadCurrentUser(): void {
    const userStr = localStorage.getItem(this.userKey);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.email) {
          this.currentUserSubject.next(user);
          console.log('Загружен пользователь из localStorage:', user);
        } else {
          console.warn('В localStorage найдены некорректные данные пользователя');
          localStorage.removeItem(this.userKey);
        }
      } catch (e) {
        console.error('Ошибка при разборе данных пользователя из localStorage:', e);
        localStorage.removeItem(this.userKey);
      }
    }
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${this.authUrl}/signin`, { email, password })
      .pipe(
        switchMap(response => {
          if (response?.token) {
            // Сохраняем токен
            localStorage.setItem(this.tokenKey, response.token);
            console.log('Токен успешно сохранен в localStorage');

            // После получения токена запрашиваем информацию о пользователе
            return this.getUserInfo(email).pipe(
              map(user => {
                // Проверяем, что получили полные данные пользователя
                if (!user || !user.email) {
                  throw new Error('Получены некорректные данные пользователя');
                }

                // Сохраняем данные пользователя
                localStorage.setItem(this.userKey, JSON.stringify(user));
                console.log('Данные пользователя успешно сохранены в localStorage:', user);
                this.currentUserSubject.next(user);
                return user;
              })
            );
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Ошибка при входе:', error);
          return throwError(() => error);
        })
      );
  }

  register(name: string, email: string, password: string, phoneNumber?: string): Observable<User> {
    const normalizedPhoneNumber = (phoneNumber ?? '').trim();
    return this.http.post(`${this.authUrl}/signup`,
      { name, email, password, phoneNumber: normalizedPhoneNumber },
      { responseType: 'text' })
      .pipe(
        map((raw) => {
          try {
            return JSON.parse(raw) as AuthResponse;
          } catch (e) {
            console.error('Не удалось разобрать ответ /auth/signup:', raw);
            throw new Error('Некорректный ответ сервера при регистрации');
          }
        }),
        switchMap(response => {
          if (response && response.token) {
            localStorage.setItem(this.tokenKey, response.token);
            return this.getUserInfo(email);
          }
          return throwError(() => new Error('Invalid response format'));
        }),
        catchError(error => throwError(() => error))
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    const userStr = localStorage.getItem(this.userKey);

    if (!token || !userStr) {
      return false;
    }

    try {
      // Проверяем, что данные пользователя корректные
      const user = JSON.parse(userStr);
      return !!(user && user.email);
    } catch {
      return false;
    }
  }

  getCurrentUser(): User | null {
    const userJson = localStorage.getItem(this.userKey);
    if (!userJson) {
      console.warn('Данные пользователя не найдены в localStorage');
      return null;
    }

    try {
      const user = JSON.parse(userJson);
      if (!user || !user.email) {
        console.warn('В localStorage найдены некорректные данные пользователя');
        return null;
      }
      return user;
    } catch (e) {
      console.error('Ошибка при разборе данных пользователя из localStorage:', e);
      return null;
    }
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === UserRole.ADMIN;
  }

  isOrganizer(): boolean {
    const user = this.getCurrentUser();
    return user?.role === UserRole.ORGANIZER || user?.role === UserRole.ADMIN;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Получение информации о пользователе
  getUserInfo(email: string): Observable<User> {
    return this.verifyToken().pipe(
      switchMap(response => {
        return this.http.get<Omit<User, 'role'>>(`${this.usersUrl}`, { params: { email } }).pipe(
          map(user => {
            if (!user || !user.email) {
              throw new Error('Получены некорректные данные пользователя');
            }

            const completeUser: User = {
              ...(user as any),
              role: (response?.role as UserRole) ?? UserRole.PARTICIPANT
            };
            localStorage.setItem(this.userKey, JSON.stringify(completeUser));
            console.log('Обновлены данные пользователя в localStorage:', completeUser);
            this.currentUserSubject.next(completeUser);
            return completeUser;
          })
        );
      }),
      catchError(error => {
        console.error('Ошибка получения информации о пользователе:', error);

        const savedUser = this.getCurrentUser();
        if (savedUser && savedUser.email === email) {
          console.log('Используем сохраненные данные пользователя:', savedUser);
          return of(savedUser);
        }

        return throwError(() => error);
      })
    );
  }

  updateUserData(userData: Partial<User>): Observable<any> {
    return this.http.patch<any>(`${this.usersUrl}/me`, userData).pipe(
      switchMap(() => {
        const email = userData.email ?? this.getCurrentUser()?.email;
        if (!email) {
          return of(null);
        }
        return this.getUserInfo(email);
      }),
      catchError(error => throwError(() => error))
    );
  }

  deleteAccount(): Observable<any> {
    const user = this.getCurrentUser();

    if (!user || !user.email) {
      return throwError(() => new Error('Не авторизован'));
    }

    const params = new HttpParams().set('email', user.email);

    return this.http.delete<any>(`${this.usersUrl}`, {
      params
    }).pipe(
      tap(() => this.logout()),
      catchError(error => throwError(() => error))
    );
  }

  deleteUserAccount(email: string): Observable<any> {
    const params = new HttpParams().set('email', email);

    return this.http.delete<any>(`${this.usersUrl}`, {
      params
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  verifyToken(): Observable<any> {
    const token = localStorage.getItem(this.tokenKey);

    if (!token) {
      return throwError(() => new Error('Токен не найден'));
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // verify-token тоже приходит как text/plain с JSON внутри
    return this.http.post(`${this.authUrl}/verify-token`, {}, { headers, responseType: 'text' })
      .pipe(
        map((raw) => {
          try {
            return JSON.parse(raw);
          } catch {
            console.error('Не удалось разобрать ответ /auth/verify-token:', raw);
            throw new Error('Некорректный ответ сервера при проверке токена');
          }
        }),
        tap(response => console.log('Ответ сервера при проверке токена:', response)),
        catchError(error => {
          console.error('Ошибка проверки токена:', error);
          return throwError(() => error);
        })
      );
  }

  // Добавляем недостающий метод для обновления текущего пользователя
  updateCurrentUser(user: User): void {
    if (!user || !user.email) {
      console.error('Попытка сохранить некорректные данные пользователя:', user);
      return;
    }

    // Получаем текущие данные пользователя и объединяем их с новыми
    const currentUser = this.getCurrentUser();
    const updatedUser = { ...currentUser, ...user };

    localStorage.setItem(this.userKey, JSON.stringify(updatedUser));
    console.log('Обновлены данные пользователя в localStorage:', updatedUser);
    this.currentUserSubject.next(updatedUser);
  }

  // Проверка, является ли пользователь участником
  isParticipant(): boolean {
    const user = this.getCurrentUser();
    return !!user && user.role === UserRole.PARTICIPANT;
  }

  // Метод для проверки, вошел ли пользователь в систему
  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    return !!token; // Возвращает true, если токен существует
  }

  // Получение роли пользователя из хранилища
  private getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }

  // Добавляем новую вспомогательную функцию для получения очищенного токена
  getCleanToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);
    return token ? token.trim() : null;
  }
}