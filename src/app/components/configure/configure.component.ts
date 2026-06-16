import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { UserProfileService } from '../../services/user-profile.service';

@Component({
  selector: 'app-configure',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="configure-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Configuration</mat-card-title>
          <mat-card-subtitle>Manage your profile settings</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form (ngSubmit)="saveCallSign()" class="config-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Call Sign</mat-label>
              <input matInput [(ngModel)]="newCallSign" name="callSign"
                     placeholder="e.g., W1ABC" required>
              <mat-hint>Your amateur radio call sign</mat-hint>
            </mat-form-field>

            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="!canSave() || isSaving()">
                <mat-icon>save</mat-icon>
                Save Changes
              </button>
            </div>
          </form>

          <div class="account-info">
            <h3>Account Information</h3>
            @if (authService.currentUser(); as user) {
              <p><strong>Email:</strong> {{ user.email }}</p>
              <p><strong>Name:</strong> {{ user.displayName }}</p>
            }
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .configure-container {
      padding: 16px;
      max-width: 600px;
      margin: 0 auto;
    }
    .config-form {
      margin-bottom: 24px;
    }
    .full-width {
      width: 100%;
    }
    .form-actions {
      margin-top: 16px;
    }
    .account-info {
      border-top: 1px solid #e0e0e0;
      padding-top: 16px;
    }
    .account-info h3 {
      margin-bottom: 8px;
    }
    .account-info p {
      margin: 4px 0;
    }
  `]
})
export class ConfigureComponent {
  authService = inject(AuthService);
  private userProfileService = inject(UserProfileService);
  private snackBar = inject(MatSnackBar);

  newCallSign = this.userProfileService.callSign() || '';
  isSaving = signal(false);

  canSave(): boolean {
    const currentCallSign = this.userProfileService.callSign();
    return !!(
      this.newCallSign.trim() &&
      this.newCallSign.trim().toUpperCase() !== currentCallSign
    );
  }

  async saveCallSign(): Promise<void> {
    if (!this.canSave()) return;

    const user = this.authService.currentUser();
    if (!user) {
      this.snackBar.open('Please sign in to save changes', 'Dismiss', { duration: 3000 });
      return;
    }

    this.isSaving.set(true);

    try {
      await this.userProfileService.saveCallSign(
        user.uid,
        this.newCallSign.trim().toUpperCase()
      );
      this.newCallSign = this.userProfileService.callSign() || '';
      this.snackBar.open('Call sign updated successfully', 'Dismiss', { duration: 3000 });
    } catch (error) {
      console.error('Error saving call sign:', error);
      this.snackBar.open('Error saving call sign', 'Dismiss', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
    }
  }
}
