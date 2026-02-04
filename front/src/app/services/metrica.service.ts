import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class MetricaService {
    private apiUrl = `${environment.apiUrl}/metrics`;
    private tokenKey = 'auth_token';
    private readonly yaMetricaId = environment.yaMetricaId || null;

    constructor(private http: HttpClient) { }

    trackPageView(pageName: string, pageParams: any = {}): void {
        if (typeof window === 'undefined') return;

        if (this.yaMetricaId && (window as any).ym) {
            try {
                (window as any).ym(this.yaMetricaId, 'hit', pageName, {
                    title: pageParams.title || document.title,
                    referer: pageParams.referer || document.referrer,
                    params: pageParams
                });
            } catch (error) {
                console.error('Error tracking page view:', error);
            }
        }
    }

    trackEventView(eventId: number, eventName: string): void {
        // Track event views for analytics
        this.sendMetric({
            type: 'EVENT_VIEW',
            eventId: eventId,
            eventName: eventName,
            timestamp: new Date().toISOString()
        });

        if (typeof window === 'undefined') return;

        if (this.yaMetricaId && (window as any).ym) {
            try {
                (window as any).ym(this.yaMetricaId, 'reachGoal', 'event_view', {
                    event_id: eventId,
                    event_title: eventName
                });
            } catch (error) {
                console.error('Error tracking event view:', error);
            }
        }
    }

    trackEventRegistration(eventId: number, eventName: string): void {
        this.sendMetric({
            type: 'event_registration',
            params: {
                eventId,
                eventTitle: eventName
            }
        });
    }

    trackQuizStart(quizId: number, eventId: number): void {
        // Track quiz starts for analytics
        this.sendMetric({
            type: 'QUIZ_START',
            quizId: quizId,
            eventId: eventId,
            timestamp: new Date().toISOString()
        });
    }

    trackQuizCompletion(quizId: number, eventId: number, score: number): void {
        // Track quiz completions for analytics
        this.sendMetric({
            type: 'QUIZ_COMPLETION',
            quizId: quizId,
            eventId: eventId,
            score: score,
            timestamp: new Date().toISOString()
        });
    }

    trackFormSubmission(formName: string, formData: any = {}): void {
        if (typeof window === 'undefined') return;

        // Удаляем конфиденциальные данные
        const safeFormData = { ...formData };
        delete safeFormData.password;
        delete safeFormData.passwordConfirm;

        if (this.yaMetricaId && (window as any).ym) {
            try {
                (window as any).ym(this.yaMetricaId, 'reachGoal', 'form_submission', {
                    form_name: formName,
                    form_data: safeFormData
                });
            } catch (error) {
                console.error('Error tracking form submission:', error);
            }
        }
    }

    private sendMetric(metric: any): void {
        if (this.yaMetricaId && (window as any).ym) {
            try {
                (window as any).ym(this.yaMetricaId, 'reachGoal', metric.action, {
                    category: metric.category,
                    label: metric.label,
                    value: metric.value
                });
            } catch (error) {
                console.error('Error sending metric:', error);
            }
        }
    }

    trackEvent(category: string, action: string, label?: string, value?: number): void {
        if (typeof window === 'undefined') return;

        const metric = {
            category,
            action,
            label,
            value
        };

        this.sendMetric(metric);
    }

    trackUserRegistration(): void {
        this.sendMetric({
            type: 'user_registration',
            params: {}
        });
    }

    // For admin dashboard - get metrics by type
    getMetrics(type: string, startDate?: string, endDate?: string): Observable<any[]> {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) {
            return throwError(() => new Error('Not authenticated'));
        }

        const headers = new HttpHeaders().set('Authorization', token);
        let params: any = { type };

        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        return this.http.get<any[]>(`${this.apiUrl}/get`, { headers, params })
            .pipe(
                catchError(error => throwError(() => error))
            );
    }
}
