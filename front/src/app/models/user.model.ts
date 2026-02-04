export enum UserRole {
    PARTICIPANT = 'participant',
    ORGANIZER = 'organizer',
    ADMIN = 'admin'
}

export interface User {
    id: number;
    name: string;
    email: string;
    phoneNumber?: string;
    role: UserRole;
}