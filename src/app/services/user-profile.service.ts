import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from './auth.service';
import { FirestoreService } from './firestore.service';
import { CallSignDialogComponent } from '../components/call-sign-dialog/call-sign-dialog.component';
import { UserProfile, RadioSetup, Location, RepeaterInfo } from '../models/signal-report.model';

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private authService = inject(AuthService);
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);

  readonly profile = signal<UserProfile | null>(null);
  readonly isLoading = signal(false);

  readonly callSign = computed(() => this.profile()?.callSign || null);
  readonly radioSetups = computed(() => this.profile()?.radioSetups || []);
  readonly currentRadioId = computed(() => this.profile()?.currentRadioId || null);
  readonly currentRadio = computed(() => {
    const setups = this.radioSetups();
    const currentId = this.currentRadioId();
    return setups.find(r => r.id === currentId) || null;
  });
  readonly location = computed(() => this.profile()?.location || null);
  readonly useRepeater = computed(() => this.profile()?.useRepeater || false);
  readonly repeaterInfo = computed(() => this.profile()?.repeaterInfo || null);
  readonly simplexFrequency = computed(() => this.profile()?.simplexFrequency || '146.52');

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadUserProfile(user.uid, user.email || '', user.displayName || '');
      } else {
        this.profile.set(null);
      }
    });
  }

  private async loadUserProfile(uid: string, email: string, displayName: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const existingProfile = await this.firestoreService.getUserProfile(uid);
      if (existingProfile?.callSign) {
        this.profile.set(existingProfile);
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
    const updates: Partial<UserProfile> = { callSign };

    if (email || user?.email) {
      updates.email = email || user?.email || '';
    }
    if (displayName || user?.displayName) {
      updates.displayName = displayName || user?.displayName || '';
    }

    await this.firestoreService.setUserProfile(uid, updates);

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      ...updates
    } as UserProfile);
  }

  async addRadioSetup(setup: Omit<RadioSetup, 'id' | 'createdAt'>): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const newSetup: RadioSetup = {
      ...setup,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };

    const currentSetups = this.radioSetups();
    const updatedSetups = [...currentSetups, newSetup];

    await this.firestoreService.setUserProfile(user.uid, { radioSetups: updatedSetups });

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      radioSetups: updatedSetups
    } as UserProfile);
  }

  async updateRadioSetup(setup: RadioSetup): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const currentSetups = this.radioSetups();
    const updatedSetups = currentSetups.map(s => s.id === setup.id ? setup : s);

    await this.firestoreService.setUserProfile(user.uid, { radioSetups: updatedSetups });

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      radioSetups: updatedSetups
    } as UserProfile);
  }

  async deleteRadioSetup(id: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const currentSetups = this.radioSetups();
    const updatedSetups = currentSetups.filter(s => s.id !== id);

    const updates: Partial<UserProfile> = { radioSetups: updatedSetups };

    // If we're deleting the current radio, clear the selection
    if (this.currentRadioId() === id) {
      updates.currentRadioId = undefined;
    }

    await this.firestoreService.setUserProfile(user.uid, updates);

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      ...updates
    } as UserProfile);
  }

  async setCurrentRadio(radioId: string | null): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    await this.firestoreService.setUserProfile(user.uid, { currentRadioId: radioId || undefined });

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      currentRadioId: radioId || undefined
    } as UserProfile);
  }

  async setLocation(location: Location): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    await this.firestoreService.setUserProfile(user.uid, { location });

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      location
    } as UserProfile);
  }

  async setRepeaterMode(useRepeater: boolean, repeaterInfo?: RepeaterInfo, simplexFrequency?: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const updates: Partial<UserProfile> = { useRepeater };

    if (useRepeater && repeaterInfo) {
      updates.repeaterInfo = repeaterInfo;
    } else if (!useRepeater && simplexFrequency) {
      updates.simplexFrequency = simplexFrequency;
    }

    await this.firestoreService.setUserProfile(user.uid, updates);

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      ...updates
    } as UserProfile);
  }

  private getDefaultProfile(): UserProfile {
    return {
      callSign: '',
      email: '',
      displayName: '',
      radioSetups: [],
      useRepeater: false,
      simplexFrequency: '146.52',
      updatedAt: new Date()
    };
  }
}
