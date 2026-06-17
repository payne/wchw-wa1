import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';
import { InvitationService } from '../../services/invitation.service';
import { Invitation } from '../../models/signal-report.model';

@Component({
  selector: 'app-invite-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSnackBarModule,
    MatDividerModule,
    MatListModule,
    MatTooltipModule
  ],
  template: `
    <div class="invite-users-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>person_add</mat-icon>
            Invite Users
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="description">
            Enter email addresses (one per line) to generate invitation links.
            Share these links with people you want to invite.
          </p>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email Addresses</mat-label>
            <textarea matInput [(ngModel)]="emailsText" rows="5"
                      placeholder="Enter email addresses, one per line:&#10;user1@example.com&#10;user2@example.com"></textarea>
            <mat-hint>{{ getEmailCount() }} email(s) entered</mat-hint>
          </mat-form-field>

          <div class="actions">
            <button mat-raised-button color="primary"
                    [disabled]="isCreating() || getEmailCount() === 0"
                    (click)="createInvitations()">
              <mat-icon>send</mat-icon>
              Generate Invitation Links
            </button>
          </div>

          @if (newInvitations().length > 0) {
            <mat-divider></mat-divider>
            <h3>New Invitations Created</h3>
            <mat-list>
              @for (inv of newInvitations(); track inv.id) {
                <mat-list-item class="invitation-item">
                  <div class="invitation-content">
                    <div class="invitation-email">{{ inv.email }}</div>
                    <div class="invitation-url">{{ getInviteUrl(inv) }}</div>
                  </div>
                  <button mat-icon-button (click)="copyUrl(inv)"
                          matTooltip="Copy invitation URL">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </mat-list-item>
              }
            </mat-list>
            <div class="copy-all-actions">
              <button mat-stroked-button (click)="copyAllUrls()">
                <mat-icon>content_copy</mat-icon>
                Copy All URLs
              </button>
            </div>
          }
        </mat-card-content>
      </mat-card>

      @if (pendingInvitations().length > 0) {
        <mat-card>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>pending</mat-icon>
              Pending Invitations
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              @for (inv of pendingInvitations(); track inv.id) {
                <mat-list-item class="invitation-item">
                  <div class="invitation-content">
                    <div class="invitation-email">{{ inv.email }}</div>
                    <div class="invitation-url">{{ getInviteUrl(inv) }}</div>
                  </div>
                  <button mat-icon-button (click)="copyUrl(inv)"
                          matTooltip="Copy invitation URL">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </mat-list-item>
              }
            </mat-list>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .invite-users-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .description {
      color: #666;
      margin-bottom: 16px;
    }
    .full-width {
      width: 100%;
    }
    .actions {
      margin-top: 16px;
    }
    h3 {
      margin: 16px 0 8px;
      color: #333;
    }
    .invitation-item {
      height: auto !important;
      padding: 12px 0;
    }
    .invitation-content {
      flex: 1;
      min-width: 0;
    }
    .invitation-email {
      font-weight: 500;
    }
    .invitation-url {
      font-size: 0.85em;
      color: #666;
      word-break: break-all;
      margin-top: 4px;
    }
    .copy-all-actions {
      margin-top: 16px;
    }
    mat-divider {
      margin: 24px 0;
    }
  `]
})
export class InviteUsersComponent implements OnInit {
  private authService = inject(AuthService);
  private invitationService = inject(InvitationService);
  private snackBar = inject(MatSnackBar);

  emailsText = '';
  isCreating = signal(false);
  newInvitations = signal<Invitation[]>([]);
  pendingInvitations = signal<Invitation[]>([]);

  getEmailCount(): number {
    return this.parseEmails().length;
  }

  ngOnInit(): void {
    this.loadPendingInvitations();
  }

  private parseEmails(): string[] {
    return this.emailsText
      .split('\n')
      .map(email => email.trim().toLowerCase())
      .filter(email => email && email.includes('@'));
  }

  private async loadPendingInvitations(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    try {
      const invitations = await this.invitationService.getPendingInvitations(user.uid);
      this.pendingInvitations.set(invitations);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  }

  async createInvitations(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const emails = this.parseEmails();
    if (emails.length === 0) return;

    this.isCreating.set(true);
    try {
      const invitations = await this.invitationService.createInvitations(
        emails,
        user.uid,
        user.email || ''
      );

      this.newInvitations.set(invitations);
      this.emailsText = '';
      this.snackBar.open(`Created ${invitations.length} invitation(s)`, 'Dismiss', {
        duration: 3000
      });

      // Refresh pending list
      await this.loadPendingInvitations();
    } catch (error) {
      console.error('Error creating invitations:', error);
      this.snackBar.open('Failed to create invitations', 'Dismiss', {
        duration: 3000
      });
    } finally {
      this.isCreating.set(false);
    }
  }

  getInviteUrl(invitation: Invitation): string {
    return this.invitationService.buildInviteUrl(invitation.token);
  }

  async copyUrl(invitation: Invitation): Promise<void> {
    const url = this.getInviteUrl(invitation);
    try {
      await navigator.clipboard.writeText(url);
      this.snackBar.open('URL copied to clipboard', 'Dismiss', { duration: 2000 });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      this.snackBar.open('Failed to copy URL', 'Dismiss', { duration: 2000 });
    }
  }

  async copyAllUrls(): Promise<void> {
    const urls = this.newInvitations()
      .map(inv => `${inv.email}: ${this.getInviteUrl(inv)}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(urls);
      this.snackBar.open('All URLs copied to clipboard', 'Dismiss', { duration: 2000 });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      this.snackBar.open('Failed to copy URLs', 'Dismiss', { duration: 2000 });
    }
  }
}
