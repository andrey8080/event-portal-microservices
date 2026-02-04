import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/services/auth.service';
import { Subscription } from 'rxjs';
import { User } from '@app/models/user.model';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
    isAuthenticated = false;
    isOrganizer = false;
    isAdmin = false;
    currentUser: User | null = null;

    private userSubscription: Subscription | null = null;

    constructor(public authService: AuthService) { }

    ngOnInit(): void {
        this.userSubscription = this.authService.currentUser$.subscribe(user => {
            this.currentUser = user;
            this.isAuthenticated = !!user;
            this.isOrganizer = this.authService.isOrganizer();
            this.isAdmin = this.authService.isAdmin();
        });
    }

    ngOnDestroy(): void {
        if (this.userSubscription) {
            this.userSubscription.unsubscribe();
        }
    }
}
