import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { UserProfileService } from '../../services/user-profile.service';
import { FirestoreService } from '../../services/firestore.service';
import { SignalReport } from '../../models/signal-report.model';

interface GroupMember {
  callSign: string;
  reportCount: number;
  lastActive: Date;
}

@Component({
  selector: 'app-group-members',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="group-members-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>groups</mat-icon>
            @if (currentGroup(); as group) {
              #{{ group.groupNumber }} - {{ group.nickname }}
            } @else {
              No Group Selected
            }
          </mat-card-title>
          <mat-card-subtitle>
            @if (members().length > 0) {
              {{ members().length }} member(s) have logged reports
            }
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (isLoading()) {
            <div class="loading">
              <mat-spinner diameter="32"></mat-spinner>
              <span>Loading members...</span>
            </div>
          } @else if (!currentGroup()) {
            <p class="no-group">No group is currently selected. Go to Configure to select a group.</p>
          } @else if (members().length === 0) {
            <p class="no-members">No reports have been logged to this group yet.</p>
          } @else {
            <mat-list>
              @for (member of members(); track member.callSign) {
                <mat-list-item class="member-item">
                  <mat-icon matListItemIcon>person</mat-icon>
                  <div matListItemTitle class="member-callsign">{{ member.callSign }}</div>
                  <div matListItemLine class="member-details">
                    {{ member.reportCount }} report(s) | Last active: {{ formatDate(member.lastActive) }}
                  </div>
                </mat-list-item>
              }
            </mat-list>
          }
        </mat-card-content>
        <mat-card-actions>
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Back
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .group-members-container {
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
    }
    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .loading {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
      justify-content: center;
    }
    .no-group, .no-members {
      color: #666;
      text-align: center;
      padding: 24px;
    }
    .member-item {
      border-bottom: 1px solid #eee;
    }
    .member-callsign {
      font-weight: 600;
      font-size: 1.1em;
    }
    .member-details {
      color: #666;
      font-size: 0.9em;
    }
    mat-card-actions {
      padding: 16px;
    }
  `]
})
export class GroupMembersComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private userProfileService = inject(UserProfileService);
  private firestoreService = inject(FirestoreService);

  currentGroup = this.userProfileService.currentGroup;
  members = signal<GroupMember[]>([]);
  isLoading = signal(true);

  private reportsSubscription?: Subscription;

  ngOnInit(): void {
    this.loadGroupMembers();
  }

  ngOnDestroy(): void {
    this.reportsSubscription?.unsubscribe();
  }

  private loadGroupMembers(): void {
    const group = this.currentGroup();
    if (!group) {
      this.isLoading.set(false);
      return;
    }

    this.reportsSubscription = this.firestoreService.getSignalReports().subscribe({
      next: (reports) => {
        // Filter reports for current group
        const groupReports = reports.filter(r => r.groupId === group.id);

        // Build member list from receivers
        const memberMap = new Map<string, GroupMember>();

        for (const report of groupReports) {
          const callSign = report.receiverCall;
          if (!callSign) continue;

          const existing = memberMap.get(callSign);
          const reportTime = this.toDate(report.time);

          if (existing) {
            existing.reportCount++;
            if (reportTime > existing.lastActive) {
              existing.lastActive = reportTime;
            }
          } else {
            memberMap.set(callSign, {
              callSign,
              reportCount: 1,
              lastActive: reportTime
            });
          }
        }

        // Sort by last active (most recent first)
        const sortedMembers = Array.from(memberMap.values())
          .sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());

        this.members.set(sortedMembers);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading reports:', error);
        this.isLoading.set(false);
      }
    });
  }

  private toDate(value: any): Date {
    if (!value) return new Date(0);
    if (value.toDate) return value.toDate();
    if (value instanceof Date) return value;
    return new Date(value);
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
