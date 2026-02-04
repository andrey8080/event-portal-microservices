// import { Component, OnInit } from '@angular/core';
// import { ActivatedRoute } from '@angular/router';
// import { AuthService } from '../../services/auth.service';
// import { TicketService } from '../../services/ticket.service';
// import { Ticket, TicketStatus } from '../../models/ticket.model';
// import { CommonModule } from '@angular/common';
// import { RouterModule } from '@angular/router';

// @Component({
//     selector: 'app-user-tickets',
//     // templateUrl: './user-tickets.component.html',
//     styleUrls: ['./user-tickets.component.scss'],
//     standalone: true,
//     imports: [CommonModule, RouterModule]
// })
// export class UserTicketsComponent implements OnInit {
//     tickets: Ticket[] = [];
//     isLoading: boolean = true;
//     error: string | null = null;
//     TicketStatus = TicketStatus; // Для использования енума в шаблоне

//     constructor(
//         private route: ActivatedRoute,
//         private authService: AuthService,
//         private ticketService: TicketService
//     ) { }

//     ngOnInit(): void {
//         this.loadTickets();
//     }

//     loadTickets(): void {
//         const currentUser = this.authService.getCurrentUser();
//         if (!currentUser) {
//             this.error = 'Вы не авторизованы';
//             this.isLoading = false;
//             return;
//         }

//         const userId = currentUser.id;
//         this.ticketService.getUserTickets(userId).subscribe({
//             next: (tickets) => {
//                 this.tickets = tickets;
//                 this.isLoading = false;
//             },
//             error: (err) => {
//                 this.error = 'Ошибка загрузки билетов: ' + err.message;
//                 this.isLoading = false;
//             }
//         });
//     }

//     cancelTicket(ticketId: number): void {
//         this.ticketService.updateTicketStatus(ticketId, TicketStatus.CANCELLED).subscribe({
//             next: (updatedTicket) => {
//                 // Обновляем билет в списке
//                 const index = this.tickets.findIndex(t => t.id === ticketId);
//                 if (index !== -1) {
//                     this.tickets[index] = updatedTicket;
//                 }
//             },
//             error: (err) => {
//                 this.error = 'Ошибка при отмене билета: ' + err.message;
//             }
//         });
//     }

//     // Метод для проверки, истек ли срок действия билета
//     isExpired(ticket: Ticket): boolean {
//         if (!ticket.eventDate) return false;
//         return new Date() > ticket.eventDate;
//     }

//     // Метод для отображения статуса билета
//     getStatusText(status: TicketStatus): string {
//         switch (status) {
//             case TicketStatus.RESERVED: return 'Зарезервирован';
//             case TicketStatus.PAID: return 'Оплачен';
//             case TicketStatus.USED: return 'Использован';
//             case TicketStatus.CANCELLED: return 'Отменен';
//             default: return 'Неизвестный статус';
//         }
//     }

//     // Метод для получения класса стиля в зависимости от статуса билета
//     getStatusClass(status: TicketStatus): string {
//         switch (status) {
//             case TicketStatus.RESERVED: return 'text-warning';
//             case TicketStatus.PAID: return 'text-success';
//             case TicketStatus.USED: return 'text-secondary';
//             case TicketStatus.CANCELLED: return 'text-danger';
//             default: return '';
//         }
//     }
// }
