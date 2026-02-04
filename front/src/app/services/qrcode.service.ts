import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class QrcodeService {
  // Примечание: отсутствует соответствующий endpoint на бэкенде
  // На бэкенде нужно добавить контроллер для QR-кодов
  private apiUrl = `${environment.apiUrl}/qrcode`;
  private tokenKey = 'auth_token';

  constructor(private http: HttpClient) { }

  generateQRCode(ticketId: number): Observable<any> {
    const authService = inject(AuthService);
    const token = authService.getCleanToken();
    if (!token) {
      return throwError(() => new Error('Not authenticated'));
    }

    let params = new HttpParams().set('ticketId', ticketId);

    return this.http.get<any>(`${this.apiUrl}/generate`, {
      headers: { 'Authorization': token },
      params: params
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  validateQRCode(qrData: string): Observable<any> {
    const authService = inject(AuthService);
    const token = authService.getCleanToken();
    if (!token) {
      return throwError(() => new Error('Not authenticated'));
    }

    return this.http.post<any>(`${this.apiUrl}/validate`, { qrData }, {
      headers: { 'Authorization': token }
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }
}