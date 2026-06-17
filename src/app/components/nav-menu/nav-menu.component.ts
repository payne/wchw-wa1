import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';
import { UserProfileService } from '../../services/user-profile.service';
import { AdminService } from '../../services/admin.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-nav-menu',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <mat-toolbar color="primary">
      <span class="app-title">Signal Logger</span>
      <span class="spacer"></span>

      @if (authService.isAuthenticated()) {
        <div class="user-info">
          <span class="call-sign">{{ userProfileService.callSign() }}</span>
          @if (userProfileService.currentGroup(); as group) {
            <a routerLink="/group-members" class="group-indicator" matTooltip="View group members">
              <mat-icon>groups</mat-icon>
              <span class="group-name">#{{ group.groupNumber }}</span>
            </a>
          }
        </div>
        <button mat-icon-button (click)="toggleTheme()"
                [matTooltip]="themeService.isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'">
          <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>
        <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Menu">
          <mat-icon>menu</mat-icon>
        </button>
        <mat-menu #menu="matMenu">
          <a mat-menu-item routerLink="/home">
            <mat-icon>home</mat-icon>
            <span>Home</span>
          </a>
          <a mat-menu-item routerLink="/group-members">
            <mat-icon>groups</mat-icon>
            <span>Group Members</span>
          </a>
          <a mat-menu-item routerLink="/configure">
            <mat-icon>settings</mat-icon>
            <span>Configure</span>
          </a>
          @if (canInvite()) {
            <a mat-menu-item routerLink="/invite">
              <mat-icon>person_add</mat-icon>
              <span>Invite Users</span>
            </a>
          }
          <a mat-menu-item routerLink="/about">
            <mat-icon>info</mat-icon>
            <span>About</span>
          </a>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="toggleTheme()">
            <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            <span>{{ themeService.isDarkMode() ? 'Light Mode' : 'Dark Mode' }}</span>
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      } @else {
        <button mat-icon-button (click)="toggleTheme()"
                [matTooltip]="themeService.isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'">
          <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>
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
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: 8px;
    }
    .call-sign {
      font-weight: 500;
    }
    .group-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.15);
      text-decoration: none;
      color: inherit;
      font-size: 0.9em;
      cursor: pointer;
      transition: background 0.2s;
    }
    .group-indicator:hover {
      background: rgba(255, 255, 255, 0.25);
    }
    .group-indicator mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .group-name {
      font-weight: 500;
    }
    a[mat-button], a[mat-menu-item] {
      text-decoration: none;
    }
  `]
})
export class NavMenuComponent implements OnInit {
  authService = inject(AuthService);
  userProfileService = inject(UserProfileService);
  themeService = inject(ThemeService);
  private adminService = inject(AdminService);

  ngOnInit(): void {
    this.adminService.loadAdminConfig();
  }

  canInvite(): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;

    // Admins can invite
    if (this.adminService.isAdmin(user.email)) {
      return true;
    }

    // Invited users can invite
    const profile = this.userProfileService.profile();
    return !!(profile?.invitedByUid);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  async login(): Promise<void> {
    await this.authService.signInWithGoogle();
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
  }
}
