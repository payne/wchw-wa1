import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Firestore, doc, setDoc, Timestamp } from '@angular/fire/firestore';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-cli-auth',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="cli-auth-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>CLI Authentication</mat-card-title>
          <mat-card-subtitle>Link your CLI to your account</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (success()) {
            <div class="success-message">
              <mat-icon class="success-icon">check_circle</mat-icon>
              <h3>Authentication Successful!</h3>
              <p>You can close this window and return to your terminal.</p>
              <p class="email-info">Authenticated as: {{ authService.currentUser()?.email }}</p>
            </div>
          } @else {
            <p class="instructions">
              Enter the code displayed in your terminal to authenticate the CLI.
            </p>

            <form (ngSubmit)="submitCode()" class="code-form">
              <mat-form-field appearance="outline" class="code-input">
                <mat-label>Device Code</mat-label>
                <input matInput
                       [(ngModel)]="deviceCode"
                       name="deviceCode"
                       placeholder="XXXX-XXXX"
                       [disabled]="isSubmitting()"
                       maxlength="9"
                       (input)="formatCode()">
                <mat-hint>Enter the 8-character code from your terminal</mat-hint>
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit"
                      [disabled]="!isValidCode() || isSubmitting()">
                @if (isSubmitting()) {
                  <mat-spinner diameter="20" class="button-spinner"></mat-spinner>
                  Authenticating...
                } @else {
                  <mat-icon>link</mat-icon>
                  Link CLI
                }
              </button>
            </form>

            @if (error()) {
              <p class="error-message">{{ error() }}</p>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .cli-auth-container {
      padding: 16px;
      max-width: 500px;
      margin: 40px auto;
    }
    .instructions {
      margin-bottom: 24px;
      color: #666;
    }
    .code-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .code-input {
      width: 100%;
    }
    .code-input input {
      font-family: monospace;
      font-size: 24px;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-align: center;
    }
    .button-spinner {
      display: inline-block;
      margin-right: 8px;
    }
    .success-message {
      text-align: center;
      padding: 24px;
    }
    .success-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #4caf50;
    }
    .success-message h3 {
      color: #4caf50;
      margin: 16px 0;
    }
    .email-info {
      color: #666;
      font-style: italic;
    }
    .error-message {
      color: #f44336;
      margin-top: 16px;
      text-align: center;
    }
    button[type="submit"] {
      height: 48px;
    }
  `]
})
export class CliAuthComponent {
  authService = inject(AuthService);
  private firestore = inject(Firestore);
  private snackBar = inject(MatSnackBar);

  deviceCode = '';
  isSubmitting = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  formatCode(): void {
    // Remove any non-alphanumeric characters
    let code = this.deviceCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Add hyphen after 4 characters
    if (code.length > 4) {
      code = code.slice(0, 4) + '-' + code.slice(4, 8);
    }

    this.deviceCode = code;
  }

  isValidCode(): boolean {
    // Check for format XXXX-XXXX (8 alphanumeric chars with hyphen)
    const code = this.deviceCode.replace('-', '');
    return code.length === 8 && /^[A-Z0-9]+$/.test(code);
  }

  async submitCode(): Promise<void> {
    if (!this.isValidCode()) return;

    const user = this.authService.currentUser();
    if (!user) {
      this.error.set('You must be logged in to authenticate the CLI.');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      // Get user's tokens
      const idToken = await user.getIdToken();
      const refreshToken = user.refreshToken;

      // Normalize the code (remove hyphen, uppercase)
      const normalizedCode = this.deviceCode.replace('-', '').toUpperCase();

      // Store tokens in Firestore
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 10 * 60 * 1000); // 10 minutes

      const sessionRef = doc(this.firestore, 'cliAuthSessions', normalizedCode);
      await setDoc(sessionRef, {
        idToken,
        refreshToken,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        createdAt: now,
        expiresAt,
        claimed: false
      });

      this.success.set(true);
      this.snackBar.open('CLI authenticated successfully!', 'Dismiss', { duration: 5000 });
    } catch (err: any) {
      console.error('Error storing CLI auth session:', err);
      this.error.set('Failed to authenticate. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
