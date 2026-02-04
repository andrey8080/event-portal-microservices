import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User, UserRole } from '../../../models/user.model';
import { Event } from '../../../models/event.model';
import { UserService } from '../../../services/user.service';
import { EventService } from '../../../services/event.service';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

declare var bootstrap: any;
declare var ApexCharts: any;

@Component({
    selector: 'app-admin-dashboard',
    templateUrl: './admin-dashboard.component.html',
    styleUrls: ['./admin-dashboard.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule]
})
export class AdminDashboardComponent implements OnInit {
    activeTab = 'dashboard';

    // Dashboard stats
    statistics = {
        totalUsers: 0,
        totalEvents: 0,
        activeTickets: 0
    };
    latestUsers: User[] = [];
    upcomingEvents: Event[] = [];
    isLoading = true;

    // Users management
    allUsers: User[] = [];
    filteredUsers: User[] = [];
    userSearchTerm = '';
    userRoleFilter = 'all';
    isLoadingUsers = false;
    userForm: FormGroup;
    editingUser: User | null = null;
    userModal: any;
    isSavingUser = false;

    // Events management
    allEvents: Event[] = [];
    filteredEvents: Event[] = [];
    eventSearchTerm = '';
    eventStatusFilter = 'all';
    isLoadingEvents = false;

    constructor(
        private userService: UserService,
        private eventService: EventService,
        private adminService: AdminService,
        private authService: AuthService,
        private fb: FormBuilder,
        private router: Router // Добавлен импорт Router
    ) {
        this.userForm = this.fb.group({
            name: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            phoneNumber: [''],
            role: ['PARTICIPANT'],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    ngOnInit(): void {
        // Check if user is admin
        if (!this.authService.isAdmin()) {
            this.router.navigate(['/']);
            return;
        }

        this.loadDashboardData();
    }

    setActiveTab(tab: string): void {
        this.activeTab = tab;

        // Load data based on active tab
        switch (tab) {
            case 'users':
                this.loadUsers();
                break;
            case 'events':
                this.loadEvents();
                break;
            case 'reports':
                this.initCharts();
                break;
        }
    }

    // Dashboard methods
    loadDashboardData(): void {
        this.isLoading = true;

        // Load statistics
        this.adminService.getStatistics().subscribe({
            next: (stats) => {
                this.statistics = stats;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading statistics:', err);
                this.isLoading = false;
            }
        });

        // Load latest users
        this.adminService.getLatestUsers(5).subscribe({
            next: (users) => {
                this.latestUsers = users;
            },
            error: (err) => {
                console.error('Error loading latest users:', err);
            }
        });

        // Load upcoming events
        this.adminService.getUpcomingEvents(5).subscribe({
            next: (events) => {
                this.upcomingEvents = events;
            },
            error: (err) => {
                console.error('Error loading upcoming events:', err);
            }
        });
    }

    // Users management methods
    loadUsers(): void {
        this.isLoadingUsers = true;

        this.adminService.getAllUsers().subscribe({
            next: (users) => {
                this.allUsers = users;
                this.filteredUsers = users;
                this.isLoadingUsers = false;
            },
            error: (err) => {
                console.error('Error loading users:', err);
                this.isLoadingUsers = false;
            }
        });
    }

    filterUsers(): void {
        let filtered = [...this.allUsers];

        // Apply search filter
        if (this.userSearchTerm.trim() !== '') {
            const term = this.userSearchTerm.toLowerCase();
            filtered = filtered.filter(user =>
                user.name.toLowerCase().includes(term) ||
                user.email.toLowerCase().includes(term)
            );
        }

        // Apply role filter
        if (this.userRoleFilter !== 'all') {
            filtered = filtered.filter(user => user.role === this.userRoleFilter);
        }

        this.filteredUsers = filtered;
    }

    changeUserRole(user: User): void {
        this.adminService.updateUserRole(user.id, user.role as UserRole).subscribe({
            next: () => {
                console.log('User role updated');
                // Show success message
            },
            error: (err) => {
                console.error('Error updating user role:', err);
                // Show error message and revert change
            }
        });
    }

    openAddUserModal(): void {
        this.editingUser = null;
        this.userForm.reset({
            role: 'PARTICIPANT'
        });

        // Reset validators for password field
        this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
        this.userForm.get('password')?.updateValueAndValidity();

        if (!this.userModal) {
            this.userModal = new bootstrap.Modal(document.getElementById('userModal'));
        }
        this.userModal.show();
    }

    editUser(user: User): void {
        this.editingUser = user;

        this.userForm.patchValue({
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber || '',
            role: user.role || 'PARTICIPANT'
        });

        // Make password optional when editing
        this.userForm.get('password')?.clearValidators();
        this.userForm.get('password')?.updateValueAndValidity();

        if (!this.userModal) {
            this.userModal = new bootstrap.Modal(document.getElementById('userModal'));
        }
        this.userModal.show();
    }

    saveUser(): void {
        if (this.userForm.invalid) return;

        this.isSavingUser = true;
        const userData = this.userForm.value;

        if (this.editingUser) {
            // Update existing user
            this.adminService.updateUser({ ...userData, id: this.editingUser.id }).subscribe({
                next: () => {
                    this.isSavingUser = false;
                    this.userModal.hide();
                    this.loadUsers();
                },
                error: (err) => {
                    console.error('Error updating user:', err);
                    this.isSavingUser = false;
                }
            });
        } else {
            // Create new user
            this.adminService.createUser(userData).subscribe({
                next: () => {
                    this.isSavingUser = false;
                    this.userModal.hide();
                    this.loadUsers();
                },
                error: (err) => {
                    console.error('Error creating user:', err);
                    this.isSavingUser = false;
                }
            });
        }
    }

    deleteUser(user: User): void {
        if (confirm(`Вы уверены, что хотите удалить пользователя ${user.name}?`)) {
            this.adminService.deleteUser(user.id).subscribe({
                next: () => {
                    this.allUsers = this.allUsers.filter(u => u.id !== user.id);
                    this.filterUsers();
                },
                error: (err) => {
                    console.error('Error deleting user:', err);
                }
            });
        }
    }

    // Events management methods
    loadEvents(): void {
        this.isLoadingEvents = true;

        this.eventService.getEvents().subscribe({
            next: (events) => {
                this.allEvents = events;
                this.filteredEvents = events;
                this.isLoadingEvents = false;
            },
            error: (err) => {
                console.error('Error loading events:', err);
                this.isLoadingEvents = false;
            }
        });
    }

    filterEvents(): void {
        let filtered = [...this.allEvents];

        // Apply search filter
        if (this.eventSearchTerm.trim() !== '') {
            const term = this.eventSearchTerm.toLowerCase();
            filtered = filtered.filter(event =>
                event.title.toLowerCase().includes(term) ||
                event.description.toLowerCase().includes(term)
            );
        }

        // Apply status filter
        if (this.eventStatusFilter === 'upcoming') {
            filtered = filtered.filter(event => !this.isPastEvent(event));
        } else if (this.eventStatusFilter === 'past') {
            filtered = filtered.filter(event => this.isPastEvent(event));
        }

        this.filteredEvents = filtered;
    }

    isPastEvent(event: Event): boolean {
        return new Date(event.endDate) < new Date();
    }

    deleteEvent(event: Event): void {
        if (confirm(`Вы уверены, что хотите удалить событие "${event.title}"?`)) {
            this.eventService.deleteEvent(event.id).subscribe({
                next: () => {
                    this.allEvents = this.allEvents.filter(e => e.id !== event.id);
                    this.filterEvents();
                },
                error: (err) => {
                    console.error('Error deleting event:', err);
                }
            });
        }
    }

    // Reports methods
    initCharts(): void {
        setTimeout(() => {
            this.initRegistrationsChart();
            this.initPopularEventsChart();
            this.initActivityChart();
        }, 100);
    }

    initRegistrationsChart(): void {
        // Example data, should be replaced with real data from API
        const options = {
            series: [{
                name: 'Регистрации',
                data: [30, 40, 35, 50, 49, 60, 70, 91, 125]
            }],
            chart: {
                height: 250,
                type: 'line',
                toolbar: {
                    show: false
                },
                zoom: {
                    enabled: false
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'straight',
                width: 3
            },
            grid: {
                row: {
                    colors: ['#f3f3f3', 'transparent'],
                    opacity: 0.5
                }
            },
            xaxis: {
                categories: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен'],
            },
            colors: ['#0d6efd']
        };

        const chart = new ApexCharts(document.getElementById('registrationsChart'), options);
        chart.render();
    }

    initPopularEventsChart(): void {
        // Example data, should be replaced with real data from API
        const options = {
            series: [{
                name: 'Регистрации',
                data: [44, 55, 41, 67, 22]
            }],
            chart: {
                type: 'bar',
                height: 250,
                toolbar: {
                    show: false
                }
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                }
            },
            dataLabels: {
                enabled: false
            },
            xaxis: {
                categories: ['Концерт', 'Конференция', 'Выставка', 'Мастер-класс', 'Вебинар'],
            },
            colors: ['#198754']
        };

        const chart = new ApexCharts(document.getElementById('popularEventsChart'), options);
        chart.render();
    }

    initActivityChart(): void {
        // Example data, should be replaced with real data from API
        const options = {
            series: [{
                name: 'Посещения',
                data: [31, 40, 28, 51, 42, 109, 100]
            }, {
                name: 'Регистрации',
                data: [11, 32, 45, 32, 34, 52, 41]
            }],
            chart: {
                height: 300,
                type: 'area',
                toolbar: {
                    show: false
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            xaxis: {
                type: 'datetime',
                categories: [
                    '2023-11-01', '2023-11-02', '2023-11-03', '2023-11-04', '2023-11-05',
                    '2023-11-06', '2023-11-07'
                ]
            },
            tooltip: {
                x: {
                    format: 'dd/MM/yy'
                }
            },
            colors: ['#0d6efd', '#dc3545']
        };

        const chart = new ApexCharts(document.getElementById('activityChart'), options);
        chart.render();
    }

    downloadReport(reportType: string): void {
        this.adminService.downloadReport(reportType).subscribe({
            next: (data) => {
                const blob = new Blob([data], { type: 'application/vnd.ms-excel' });
                const url = window.URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = `${reportType}-report.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            },
            error: (err) => {
                console.error('Error downloading report:', err);
            }
        });
    }
}
