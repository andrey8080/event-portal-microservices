import { NgModule } from '@angular/core';
import { RouterModule, Routes, provideRouter, withComponentInputBinding } from '@angular/router';

import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { EventListComponent } from './components/events/event-list/event-list.component';
import { EventDetailComponent } from '@event-details/event-detail.component';
import { EventCreateComponent } from './components/events/event-create/event-create.component';
import { EventEditComponent } from './components/events/event-edit/event-edit.component';
import { UserProfileComponent } from './components/user/user-profile/user-profile.component';
import { UserEventsComponent } from './components/user/user-events/user-events.component';
// import { UserTicketsComponent } from './components/user/user-tickets/user-tickets.component';
import { QuizCreateComponent } from './components/quiz/quiz-create/quiz-create.component';
import { QuizPlayComponent } from './components/quiz/quiz-play/quiz-play.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';
import { OrganizerDashboardComponent } from './components/organizer/organizer-dashboard/organizer-dashboard.component';
import { NotFoundComponent } from './components/layout/not-found/not-found.component';

import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { OrganizerGuard } from './guards/organizer.guard';
import { ApplicationConfig } from '@angular/core';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'events', component: EventListComponent },
  { path: 'events/:id', component: EventDetailComponent },
  { path: 'event-create', component: EventCreateComponent, canActivate: [AuthGuard, OrganizerGuard] },
  { path: 'events/event-edit/:id', component: EventEditComponent, canActivate: [AuthGuard, OrganizerGuard] },
  { path: 'profile', component: UserProfileComponent, canActivate: [AuthGuard] },
  { path: 'my-events', component: UserEventsComponent, canActivate: [AuthGuard] },
  // { path: 'user/tickets', component: UserTicketsComponent, canActivate: [AuthGuard] },
  { path: 'events/:id/quiz/create', component: QuizCreateComponent, canActivate: [OrganizerGuard] },
  { path: 'events/:id/quiz/play', component: QuizPlayComponent, canActivate: [AuthGuard] },
  { path: 'quiz/:quizId', component: QuizPlayComponent, canActivate: [AuthGuard] },
  { path: 'events/:eventId/quiz', component: QuizPlayComponent, canActivate: [AuthGuard] },
  { path: 'admin-dashboard', component: AdminDashboardComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'organizer-dashboard', component: OrganizerDashboardComponent, canActivate: [AuthGuard, OrganizerGuard] },
  { path: '**', component: NotFoundComponent }
];

// Экспортируем конфигурацию для использования в main.ts для standalone проекта
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding())
  ]
};

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }