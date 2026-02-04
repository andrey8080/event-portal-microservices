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