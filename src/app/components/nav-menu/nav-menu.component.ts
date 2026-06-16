import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth.service';
import { UserProfileService } from '../../services/user-profile.service';

@Component({
  selector: 'app-nav-menu',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  template: `
    <mat-toolbar color="primary">
      <span class="app-title">Signal Logger</span>
      <span class="spacer"></span>

      @if (authService.isAuthenticated()) {
        <span class="call-sign">{{ userProfileService.callSign() }}</span>
        <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Menu">
          <mat-icon>menu</mat-icon>
        </button>
        <mat-menu #menu="matMenu">
          <a mat-menu-item routerLink="/home">
            <mat-icon>home</mat-icon>
            <span>Home</span>
          </a>
          <a mat-menu-item routerLink="/configure">
            <mat-icon>settings</mat-icon>
            <span>Configure</span>
          </a>
          <a mat-menu-item routerLink="/about">
            <mat-icon>info</mat-icon>
            <span>About</span>
          </a>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      } @else {
        <a mat-button routerLink="/about">About</a>
        <button mat-raised-button (click)="login()">
          <mat-icon>login</mat-icon>
          Sign In
        </button>
      }
    </mat-toolbar>
  `,
  styles: [`
    .app-title {
      font-weight: 500;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .call-sign {
      margin-right: 16px;
      font-weight: 500;
    }
    a[mat-button], a[mat-menu-item] {
      text-decoration: none;
    }
  `]
})
export class NavMenuComponent {
  authService = inject(AuthService);
  userProfileService = inject(UserProfileService);

  async login(): Promise<void> {
    await this.authService.signInWithGoogle();
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
  }
}
