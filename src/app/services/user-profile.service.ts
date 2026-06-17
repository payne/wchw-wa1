import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from './auth.service';
import { FirestoreService } from './firestore.service';
import { CallSignDialogComponent } from '../components/call-sign-dialog/call-sign-dialog.component';
import { UserProfile, RadioSetup, SavedLocation, Location, RepeaterInfo, SignalGroup } from '../models/signal-report.model';

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

  // Radio setups
  readonly radioSetups = computed(() => this.profile()?.radioSetups || []);
  readonly currentRadioId = computed(() => this.profile()?.currentRadioId || null);
  readonly currentRadio = computed(() => {
    const setups = this.radioSetups();
    const currentId = this.currentRadioId();
    return setups.find(r => r.id === currentId) || null;
  });

  // Saved locations
  readonly savedLocations = computed(() => this.profile()?.savedLocations || []);
  readonly currentLocationId = computed(() => this.profile()?.currentLocationId || null);
  readonly currentLocation = computed(() => {
    const locations = this.savedLocations();
    const currentId = this.currentLocationId();
    return locations.find(l => l.id === currentId) || null;
  });
  readonly location = computed((): Location | null => {
    const current = this.currentLocation();
    if (!current) return null;
    return {
      address: current.address,
      latitude: current.latitude,
      longitude: current.longitude
    };
  });

  // Groups
  readonly groups = computed(() => this.profile()?.groups || []);
  readonly currentGroupId = computed(() => this.profile()?.currentGroupId || null);
  readonly currentGroup = computed(() => {
    const groups = this.groups();
    const currentId = this.currentGroupId();
    return groups.find(g => g.id === currentId) || null;
  });

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

  // Radio Setups
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

  // Saved Locations
  async addLocation(location: Omit<SavedLocation, 'id' | 'createdAt'>): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const newLocation: SavedLocation = {
      ...location,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };

    const currentLocations = this.savedLocations();
    const updatedLocations = [...currentLocations, newLocation];

    await this.firestoreService.setUserProfile(user.uid, { savedLocations: updatedLocations });

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      savedLocations: updatedLocations
    } as UserProfile);
  }

  async updateLocation(location: SavedLocation): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const currentLocations = this.savedLocations();
    const updatedLocations = currentLocations.map(l => l.id === location.id ? location : l);

    await this.firestoreService.setUserProfile(user.uid, { savedLocations: updatedLocations });

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      savedLocations: updatedLocations
    } as UserProfile);
  }

  async deleteLocation(id: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const currentLocations = this.savedLocations();
    const updatedLocations = currentLocations.filter(l => l.id !== id);

    const updates: Partial<UserProfile> = { savedLocations: updatedLocations };

    if (this.currentLocationId() === id) {
      updates.currentLocationId = undefined;
    }

    await this.firestoreService.setUserProfile(user.uid, updates);

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      ...updates
    } as UserProfile);
  }

  async setCurrentLocation(locationId: string | null): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    await this.firestoreService.setUserProfile(user.uid, { currentLocationId: locationId || undefined });

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      currentLocationId: locationId || undefined
    } as UserProfile);
  }

  // Repeater Mode
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

  // Groups
  async addGroup(nickname: string, isOpen: boolean = false): Promise<SignalGroup> {
    const user = this.authService.currentUser();
    if (!user) throw new Error('User not authenticated');

    const currentGroups = this.groups();
    const nextNumber = currentGroups.length > 0
      ? Math.max(...currentGroups.map(g => g.groupNumber)) + 1
      : 1;

    const newGroup: SignalGroup = {
      id: crypto.randomUUID(),
      groupNumber: nextNumber,
      nickname: nickname,
      isOpen: isOpen,
      createdAt: new Date()
    };

    const updatedGroups = [...currentGroups, newGroup];

    // If this is the first group, set it as current
    const updates: Partial<UserProfile> = { groups: updatedGroups };
    if (currentGroups.length === 0) {
      updates.currentGroupId = newGroup.id;
    }

    await this.firestoreService.setUserProfile(user.uid, updates);

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      ...updates
    } as UserProfile);

    return newGroup;
  }

  async updateGroupNickname(groupId: string, nickname: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const currentGroups = this.groups();
    const updatedGroups = currentGroups.map(g =>
      g.id === groupId ? { ...g, nickname } : g
    );

    await this.firestoreService.setUserProfile(user.uid, { groups: updatedGroups });

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      groups: updatedGroups
    } as UserProfile);
  }

  async deleteGroup(groupId: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    const currentGroups = this.groups();
    const updatedGroups = currentGroups.filter(g => g.id !== groupId);

    const updates: Partial<UserProfile> = { groups: updatedGroups };

    if (this.currentGroupId() === groupId) {
      updates.currentGroupId = updatedGroups.length > 0 ? updatedGroups[0].id : undefined;
    }

    await this.firestoreService.setUserProfile(user.uid, updates);

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      ...updates
    } as UserProfile);
  }

  async setCurrentGroup(groupId: string | null): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    await this.firestoreService.setUserProfile(user.uid, { currentGroupId: groupId || undefined });

    const currentProfile = this.profile();
    this.profile.set({
      ...this.getDefaultProfile(),
      ...currentProfile,
      currentGroupId: groupId || undefined
    } as UserProfile);
  }

  private getDefaultProfile(): UserProfile {
    return {
      callSign: '',
      email: '',
      displayName: '',
      radioSetups: [],
      savedLocations: [],
      groups: [],
      useRepeater: false,
      simplexFrequency: '146.52',
      updatedAt: new Date()
    };
  }
}
