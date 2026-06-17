import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { OpenGroupsService } from '../../services/open-groups.service';

@Component({
  selector: 'app-no-open-groups',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="no-open-groups-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>groups</mat-icon>
            No Open Groups Available
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="info-section">
            <p>
              There are currently no open groups available for you to join.
              Open groups allow anyone to participate in signal reporting sessions.
            </p>
            <p>
              You need either an invitation from an existing member or access to an open group to use this application.
            </p>
          </div>

          <div class="notification-section">
            <h3>Get Notified</h3>
            <p>Enter your email to be notified when an open group becomes available:</p>

            @if (!isSubscribed()) {
              <div class="form-row">
                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Email Address</mat-label>
                  <input matInput type="email" [(ngModel)]="notificationEmail"
                         [placeholder]="authService.currentUser()?.email || 'your@email.com'">
                </mat-form-field>
                <button mat-raised-button color="primary"
                        [disabled]="isSubmitting() || !notificationEmail"
                        (click)="subscribeToNotifications()">
                  <mat-icon>notifications</mat-icon>
                  Notify Me
                </button>
              </div>
            } @else {
              <div class="success-message">
                <mat-icon color="primary">check_circle</mat-icon>
                <span>You'll be notified when an open group is available!</span>
              </div>
            }
          </div>

          <div class="contact-section">
            <h3>Request an Invitation</h3>
            <p>
              If you know someone who is already using this application, ask them to send you an invitation.
              Invited users have full access to all features.
            </p>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-stroked-button (click)="signOut()">
            <mat-icon>logout</mat-icon>
            Sign Out
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .no-open-groups-container {
      display: flex;
      justify-content: center;
      padding: 24px;
      min-height: 60vh;
    }
    mat-card {
      max-width: 600px;
      width: 100%;
    }
    mat-card-header {
      margin-bottom: 16px;
    }
    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-section, .notification-section, .contact-section {
      margin-bottom: 24px;
    }
    .info-section p, .notification-section p, .contact-section p {
      color: #666;
      margin: 8px 0;
    }
    h3 {
      margin: 16px 0 8px;
      color: #333;
    }
    .form-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .flex-1 {
      flex: 1;
    }
    .success-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: #e8f5e9;
      border-radius: 4px;
      color: #2e7d32;
    }
    mat-card-actions {
      padding: 16px;
      border-top: 1px solid #eee;
    }
    @media (max-width: 600px) {
      .form-row {
        flex-direction: column;
      }
      .form-row button {
        width: 100%;
      }
    }
  `]
})
export class NoOpenGroupsComponent {
  authService = inject(AuthService);
  private openGroupsService = inject(OpenGroupsService);
  private snackBar = inject(MatSnackBar);

  notificationEmail = '';
  isSubmitting = signal(false);
  isSubscribed = signal(false);

  constructor() {
    const user = this.authService.currentUser();
    if (user?.email) {
      this.notificationEmail = user.email;
    }
  }

  async subscribeToNotifications(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user || !this.notificationEmail) return;

    this.isSubmitting.set(true);
    try {
      await this.openGroupsService.subscribeToNotification(this.notificationEmail, user.uid);
      this.isSubscribed.set(true);
      this.snackBar.open('You will be notified when an open group is available', 'Dismiss', {
        duration: 3000
      });
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      this.snackBar.open('Failed to subscribe. Please try again.', 'Dismiss', {
        duration: 3000
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
