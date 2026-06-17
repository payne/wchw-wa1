import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { OpenGroupsService } from '../../services/open-groups.service';
import { UserProfileService } from '../../services/user-profile.service';
import { OpenGroup } from '../../models/signal-report.model';

@Component({
  selector: 'app-open-groups-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="open-groups-container">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>groups</mat-icon>
            Available Open Groups
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>
            These groups are open for anyone to join. Select a group to start receiving and logging signal reports.
          </p>
          <p class="note">
            Note: As an uninvited user, you can only access open groups. Request an invitation from an existing member for full access.
          </p>
        </mat-card-content>
      </mat-card>

      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Loading available groups...</p>
        </div>
      } @else if (openGroups().length === 0) {
        <mat-card class="empty-card">
          <mat-card-content>
            <mat-icon>info</mat-icon>
            <p>No open groups are currently available.</p>
            <button mat-raised-button color="primary" (click)="goToNoGroups()">
              Sign up for notifications
            </button>
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="groups-list">
          @for (group of openGroups(); track group.id) {
            <mat-card class="group-card">
              <mat-card-header>
                <mat-card-title>#{{ group.groupNumber }} - {{ group.nickname }}</mat-card-title>
                <mat-card-subtitle>Hosted by {{ group.ownerCallSign }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-actions>
                <button mat-raised-button color="primary"
                        [disabled]="isJoining()"
                        (click)="joinGroup(group)">
                  <mat-icon>login</mat-icon>
                  Join Group
                </button>
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }

      <div class="actions">
        <button mat-stroked-button (click)="signOut()">
          <mat-icon>logout</mat-icon>
          Sign Out
        </button>
      </div>
    </div>
  `,
  styles: [`
    .open-groups-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header-card {
      margin-bottom: 24px;
    }
    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .note {
      color: #666;
      font-size: 0.9em;
      margin-top: 8px;
    }
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
    }
    .empty-card {
      text-align: center;
    }
    .empty-card mat-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 32px;
    }
    .empty-card mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #666;
    }
    .groups-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .group-card {
      transition: box-shadow 0.2s;
    }
    .group-card:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .group-card mat-card-actions {
      padding: 16px;
    }
    .actions {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class OpenGroupsListComponent implements OnInit {
  private router = inject(Router);
  authService = inject(AuthService);
  private openGroupsService = inject(OpenGroupsService);
  private userProfileService = inject(UserProfileService);
  private snackBar = inject(MatSnackBar);

  openGroups = signal<OpenGroup[]>([]);
  isLoading = signal(true);
  isJoining = signal(false);

  ngOnInit(): void {
    this.loadOpenGroups();
  }

  private async loadOpenGroups(): Promise<void> {
    try {
      const groups = await this.openGroupsService.loadOpenGroups();
      this.openGroups.set(groups);
    } catch (error) {
      console.error('Error loading open groups:', error);
      this.snackBar.open('Failed to load groups', 'Dismiss', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async joinGroup(group: OpenGroup): Promise<void> {
    this.isJoining.set(true);
    try {
      // Add the group to user's profile and set as current
      const newGroup = await this.userProfileService.addGroup(group.nickname);
      await this.userProfileService.setCurrentGroup(newGroup.id);

      this.snackBar.open(`Joined group: ${group.nickname}`, 'Dismiss', { duration: 3000 });
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Error joining group:', error);
      this.snackBar.open('Failed to join group', 'Dismiss', { duration: 3000 });
    } finally {
      this.isJoining.set(false);
    }
  }

  goToNoGroups(): void {
    this.router.navigate(['/no-open-groups']);
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
    this.router.navigate(['/about']);
  }
}
