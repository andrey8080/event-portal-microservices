import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class OrganizerGuard {

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    // Разрешаем доступ, если пользователь организатор или администратор
    if (this.authService.isOrganizer() || this.authService.isAdmin()) {
      return true;
    }

    // Если пользователь не организатор, перенаправляем на главную
    return this.router.createUrlTree(['/']);
  }
}