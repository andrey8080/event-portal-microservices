export enum TicketStatus {
    RESERVED = 'RESERVED',
    PAID = 'PAID',
    USED = 'USED',
    CANCELLED = 'CANCELLED'
}

export interface Ticket {
    id: number;
    eventId: number;
    eventTitle: string;
    userId: number;
    userName: string;
    purchaseDate: Date;
    status: TicketStatus;
    qrCode?: string;
    price: number;
}