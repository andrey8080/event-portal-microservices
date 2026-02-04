import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Ticket, TicketStatus } from '../models/ticket.model';

@Injectable({
    providedIn: 'root'
})
export class TicketService {
    private apiUrl = `${environment.apiUrl}/tickets`;

    constructor(private http: HttpClient) { }

    getUserTickets(userId: number): Observable<Ticket[]> {
        return this.http.get<Ticket[]>(`${this.apiUrl}/user/${userId}`);
    }

    getEventTickets(eventId: number): Observable<Ticket[]> {
        return this.http.get<Ticket[]>(`${this.apiUrl}/event/${eventId}`);
    }

    createTicket(ticket: Partial<Ticket>): Observable<Ticket> {
        return this.http.post<Ticket>(this.apiUrl, ticket);
    }

    updateTicketStatus(ticketId: number, status: TicketStatus): Observable<Ticket> {
        return this.http.patch<Ticket>(`${this.apiUrl}/${ticketId}/status`, { status });
    }

    generateTicketPDF(ticketId: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/${ticketId}/pdf`, {
            responseType: 'blob'
        });
    }
}
