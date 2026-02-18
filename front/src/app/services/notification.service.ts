import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export enum NotificationType {
  SUCCESS = 'success',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  autoClose?: boolean;
  timeout?: number;
}

interface NotificationData {
  eventId: number;
  subject: string;
  message: string;
  recipientIds?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Примечание: отсутствует соответствующий endpoint на бэкенде
  // На бэкенде нужно добавить контроллер для уведомлений
  private apiUrl = `${environment.apiUrl}/notifications`;
  private tokenKey = 'auth_token';
  private idCounter = 0;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Преобразует Http/JS ошибку в понятный текст для пользователя.
   */
  parseHttpError(error: any, fallback = 'Произошла ошибка'): string {
    if (!error) return fallback;

    // Ошибка клиента/сети
    if (error.error instanceof ErrorEvent) {
      return error.error.message || 'Ошибка сети. Проверьте подключение к интернету.';
    }

    // Попытка вытащить данные из разных форматов ответа бэкенда
    let payload: any = error.error;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = { message: payload };
      }
    }

    const fromFields = [
      payload?.error,
      payload?.message,
      payload?.detail,
      payload?.title,
      payload?.description,
      error?.message
    ].find(v => typeof v === 'string' && v.trim().length > 0);

    if (fromFields) {
      return String(fromFields);
    }

    // Валидация (часто приходит как объект errors)
    if (payload?.errors && typeof payload.errors === 'object') {
      const validationMessages: string[] = [];
      Object.entries(payload.errors).forEach(([field, value]) => {
        if (Array.isArray(value)) {
          value.forEach(msg => validationMessages.push(`${field}: ${msg}`));
        } else if (typeof value === 'string') {
          validationMessages.push(`${field}: ${value}`);
        }
      });
      if (validationMessages.length > 0) {
        return `Ошибка валидации: ${validationMessages.join('; ')}`;
      }
    }

    // fallback по статусам
    switch (error.status) {
      case 0:
        return 'Сервер недоступен. Проверьте сеть или URL API.';
      case 400:
        return 'Некорректные данные запроса.';
      case 401:
        return 'Требуется авторизация. Войдите в аккаунт.';
      case 403:
        return 'Недостаточно прав для выполнения операции.';
      case 404:
        return 'Запрашиваемый ресурс не найден.';
      case 409:
        return 'Конфликт данных. Возможно, запись уже существует.';
      case 422:
        return 'Данные не прошли валидацию.';
      case 429:
        return 'Слишком много запросов. Попробуйте позже.';
      case 500:
        return 'Внутренняя ошибка сервера.';
      case 502:
      case 503:
      case 504:
        return 'Сервис временно недоступен. Попробуйте позже.';
      default:
        return fallback;
    }
  }

  /**
   * Показать тост с текстом, собранным из ошибки.
   */
  errorFromHttp(error: any, fallback = 'Произошла ошибка', autoClose = true, timeout = 7000): number {
    return this.error(this.parseHttpError(error, fallback), autoClose, timeout);
  }

  sendEventNotification(notification: NotificationData): Observable<any> {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return throwError(() => new Error('Not authenticated'));
    }

    return this.http.post<any>(`${this.apiUrl}/send`, notification, {
      headers: { 'Authorization': token }
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getNotifications(userId: number): Observable<any[]> {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return throwError(() => new Error('Not authenticated'));
    }

    let params = new HttpParams().set('userId', userId);

    return this.http.get<any[]>(`${this.apiUrl}`, {
      headers: { 'Authorization': token },
      params: params
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Метод для организаторов: отправка рассылки пользователям мероприятия
  sendEventBroadcast(eventId: number, subject: string, message: string): Observable<any> {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return throwError(() => new Error('Not authenticated'));
    }

    const notification = {
      eventId,
      subject,
      message
    };

    return this.http.post<any>(`${this.apiUrl}/broadcast`, notification, {
      headers: { 'Authorization': token }
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  markAsRead(notificationId: number): Observable<any> {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return throwError(() => new Error('Not authenticated'));
    }

    return this.http.put<any>(`${this.apiUrl}/${notificationId}/read`, null, {
      headers: { 'Authorization': token }
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Shows a notification
   * @param message The notification message
   * @param type The notification type
   * @param autoClose Should the notification auto close
   * @param timeout Time before auto close in ms (default 5000)
   */
  show(message: string, type: NotificationType, autoClose = true, timeout = 5000): number {
    const id = ++this.idCounter;

    const notification: Notification = {
      id,
      message,
      type,
      autoClose,
      timeout
    };

    const notifications = [...this.notificationsSubject.value, notification];
    this.notificationsSubject.next(notifications);

    if (autoClose) {
      setTimeout(() => this.close(id), timeout);
    }

    return id;
  }

  /**
   * Shows a success notification
   */
  success(message: string, autoClose = true, timeout = 5000): number {
    return this.show(message, NotificationType.SUCCESS, autoClose, timeout);
  }

  /**
   * Shows an info notification
   */
  info(message: string, autoClose = true, timeout = 5000): number {
    return this.show(message, NotificationType.INFO, autoClose, timeout);
  }

  /**
   * Shows a warning notification
   */
  warning(message: string, autoClose = true, timeout = 5000): number {
    return this.show(message, NotificationType.WARNING, autoClose, timeout);
  }

  /**
   * Shows an error notification
   */
  error(message: string, autoClose = true, timeout = 5000): number {
    return this.show(message, NotificationType.ERROR, autoClose, timeout);
  }

  /**
   * Closes a specific notification
   */
  close(id: number): void {
    const notifications = this.notificationsSubject.value.filter(n => n.id !== id);
    this.notificationsSubject.next(notifications);
  }

  /**
   * Closes all notifications
   */
  clearAll(): void {
    this.notificationsSubject.next([]);
  }
}