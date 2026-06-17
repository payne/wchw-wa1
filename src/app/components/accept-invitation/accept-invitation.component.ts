import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { InvitationService } from '../../services/invitation.service';
import { UserProfileService } from '../../services/user-profile.service';
import { FirestoreService } from '../../services/firestore.service';
import { Invitation } from '../../models/signal-report.model';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  template: `
    <div class="accept-invitation-container">
      <mat-card>
        @if (isLoading()) {
          <mat-card-content class="center-content">
            <mat-spinner diameter="48"></mat-spinner>
            <p>{{ loadingMessage() }}</p>
          </mat-card-content>
        } @else if (error()) {
          <mat-card-header>
            <mat-card-title>
              <mat-icon color="warn">error</mat-icon>
              Invitation Error
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>{{ error() }}</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="goHome()">
              Go to Home
            </button>
          </mat-card-actions>
        } @else if (success()) {
          <mat-card-header>
            <mat-card-title>
              <mat-icon color="primary">check_circle</mat-icon>
              Invitation Accepted!
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Welcome! You have been invited by <strong>{{ invitation()?.inviterEmail }}</strong>.</p>
            <p>You now have full access to the application and can invite other users.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="goHome()">
              Continue to Home
            </button>
          </mat-card-actions>
        } @else if (invitation()) {
          <mat-card-header>
            <mat-card-title>You've Been Invited!</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>You have been invited by <strong>{{ invitation()?.inviterEmail }}</strong> to join the signal reporting community.</p>
            @if (!authService.isAuthenticated()) {
              <p>Please sign in with Google to accept this invitation.</p>
            }
          </mat-card-content>
          <mat-card-actions>
            @if (!authService.isAuthenticated()) {
              <button mat-raised-button color="primary" (click)="signIn()">
                <mat-icon>login</mat-icon>
                Sign in with Google
              </button>
            } @else {
              <button mat-raised-button color="primary" (click)="acceptInvitation()">
                <mat-icon>check</mat-icon>
                Accept Invitation
              </button>
            }
          </mat-card-actions>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .accept-invitation-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
      padding: 24px;
    }
    mat-card {
      max-width: 500px;
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
    mat-card-content p {
      margin: 8px 0;
    }
    mat-card-actions {
      padding: 16px;
    }
    .center-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 32px;
    }
  `]
})
export class AcceptInvitationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  authService = inject(AuthService);
  private invitationService = inject(InvitationService);
  private userProfileService = inject(UserProfileService);
  private firestoreService = inject(FirestoreService);

  invitation = signal<Invitation | null>(null);
  isLoading = signal(true);
  loadingMessage = signal('Loading invitation...');
  error = signal<string | null>(null);
  success = signal(false);

  private token: string = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.error.set('Invalid invitation link');
      this.isLoading.set(false);
      return;
    }

    this.loadInvitation();
  }

  private async loadInvitation(): Promise<void> {
    try {
      const invitation = await this.invitationService.getInvitationByToken(this.token);

      if (!invitation) {
        this.error.set('Invitation not found. It may have expired or been used.');
        this.isLoading.set(false);
        return;
      }

      if (invitation.status !== 'pending') {
        this.error.set('This invitation has already been used.');
        this.isLoading.set(false);
        return;
      }

      this.invitation.set(invitation);
      this.isLoading.set(false);

      // If user is already authenticated, auto-accept
      if (this.authService.isAuthenticated()) {
        await this.acceptInvitation();
      }
    } catch (err) {
      console.error('Error loading invitation:', err);
      this.error.set('Failed to load invitation. Please try again.');
      this.isLoading.set(false);
    }
  }

  async signIn(): Promise<void> {
    this.isLoading.set(true);
    this.loadingMessage.set('Signing in...');

    try {
      await this.authService.signInWithGoogle();
      if (this.authService.isAuthenticated()) {
        await this.acceptInvitation();
      } else {
        this.isLoading.set(false);
      }
    } catch (err) {
      console.error('Error signing in:', err);
      this.error.set('Failed to sign in. Please try again.');
      this.isLoading.set(false);
    }
  }

  async acceptInvitation(): Promise<void> {
    const user = this.authService.currentUser();
    const invitation = this.invitation();

    if (!user || !invitation) {
      this.error.set('Please sign in to accept this invitation.');
      return;
    }

    this.isLoading.set(true);
    this.loadingMessage.set('Accepting invitation...');

    try {
      // Accept the invitation
      await this.invitationService.acceptInvitation(this.token, user.uid);

      // Update user profile with invitation info
      await this.firestoreService.setUserProfile(user.uid, {
        invitedByUid: invitation.inviterUid,
        invitedByEmail: invitation.inviterEmail,
        invitedAt: Timestamp.now()
      });

      this.success.set(true);
      this.isLoading.set(false);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      this.error.set('Failed to accept invitation. Please try again.');
      this.isLoading.set(false);
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
