import { Injectable, inject, signal, effect } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from './auth.service';
import { FirestoreService } from './firestore.service';
import { CallSignDialogComponent } from '../components/call-sign-dialog/call-sign-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private authService = inject(AuthService);
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);

  readonly callSign = signal<string | null>(null);
  readonly isLoading = signal(false);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadUserProfile(user.uid, user.email || '', user.displayName || '');
      } else {
        this.callSign.set(null);
      }
    });
  }

  private async loadUserProfile(uid: string, email: string, displayName: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const profile = await this.firestoreService.getUserProfile(uid);
      if (profile?.callSign) {
        this.callSign.set(profile.callSign);
      } else {
        this.promptForCallSign(uid, email, displayName);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private promptForCallSign(uid: string, email: string, displayName: string): void {
    const dialogRef = this.dialog.open(CallSignDialogComponent, {
      disableClose: true,
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(async (callSign: string) => {
      if (callSign) {
        await this.saveCallSign(uid, callSign, email, displayName);
      }
    });
  }

  async saveCallSign(uid: string, callSign: string, email?: string, displayName?: string): Promise<void> {
    const user = this.authService.currentUser();
    const profile: any = { callSign };

    if (email || user?.email) {
      profile.email = email || user?.email;
    }
    if (displayName || user?.displayName) {
      profile.displayName = displayName || user?.displayName;
    }

    await this.firestoreService.setUserProfile(uid, profile);
    this.callSign.set(callSign);
  }
}
