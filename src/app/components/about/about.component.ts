import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="about-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Signal Logger</mat-card-title>
          <mat-card-subtitle>Amateur Radio Signal Reporting</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>
            Signal Logger is a Progressive Web Application (PWA) for logging amateur radio
            signal observations. Track the signals you hear and share your observations
            with other operators.
          </p>

          <h3>Features</h3>
          <ul>
            <li>Log signal reports with transmitter call signs, signal strength, and timestamps</li>
            <li>View all signal reports in a real-time, sortable data grid</li>
            <li>Works offline - your reports will sync when connectivity is restored</li>
            <li>Install as a native app on your device</li>
          </ul>

          <h3>Getting Started</h3>
          <p>
            Sign in with your Google account to start logging signal reports.
            You'll be prompted to enter your amateur radio call sign on first login.
          </p>

          @if (!authService.isAuthenticated()) {
            <div class="sign-in-section">
              <button mat-raised-button color="primary" (click)="signIn()">
                <mat-icon>login</mat-icon>
                Sign in with Google
              </button>
            </div>
          }

          <p class="source-link">
            <a href="https://github.com/payne/wchw-wa1" target="_blank" rel="noopener noreferrer">
              View source on GitHub
            </a>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .about-container {
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
    }
    mat-card {
      margin-bottom: 16px;
    }
    h3 {
      margin-top: 24px;
      margin-bottom: 8px;
    }
    ul {
      padding-left: 24px;
    }
    li {
      margin-bottom: 8px;
    }
    .sign-in-section {
      margin-top: 24px;
      text-align: center;
    }
    .source-link {
      margin-top: 16px;
      text-align: center;
    }
  `]
})
export class AboutComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  async signIn(): Promise<void> {
    const user = await this.authService.signInWithGoogle();
    if (user) {
      this.router.navigate(['/home']);
    }
  }
}
