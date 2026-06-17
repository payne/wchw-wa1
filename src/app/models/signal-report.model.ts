import { Timestamp } from '@angular/fire/firestore';

export interface SignalGroup {
  id: string;
  groupNumber: number;
  nickname: string;
  isOpen: boolean;
  createdAt: Timestamp | Date;
}

export interface RadioSetup {
  id: string;
  nickname: string;
  make: string;
  model: string;
  antenna: string;
  description: string;
  createdAt: Timestamp | Date;
}

export interface Location {
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface SavedLocation {
  id: string;
  nickname: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  createdAt: Timestamp | Date;
}

export interface RepeaterInfo {
  callSign: string;
  frequency: string;
}

export interface UserProfile {
  callSign: string;
  email: string;
  displayName: string;
  radioSetups: RadioSetup[];
  currentRadioId?: string;
  savedLocations: SavedLocation[];
  currentLocationId?: string;
  groups: SignalGroup[];
  currentGroupId?: string;
  useRepeater: boolean;
  repeaterInfo?: RepeaterInfo;
  simplexFrequency: string;
  updatedAt: Timestamp | Date;
  invitedByUid?: string;
  invitedByEmail?: string;
  invitedAt?: Timestamp | Date;
}

export interface Invitation {
  id: string;
  email: string;
  inviterUid: string;
  inviterEmail: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: Timestamp | Date;
}

export interface OpenGroupNotification {
  id: string;
  email: string;
  uid: string;
  createdAt: Timestamp | Date;
}

export interface OpenGroup {
  id: string;
  groupId: string;
  groupNumber: number;
  nickname: string;
  ownerUid: string;
  ownerCallSign: string;
  createdAt: Timestamp | Date;
}

export interface SignalReport {
  id?: string;
  transmitterCall: string;
  signalHeard: string;
  time: Timestamp | Date;
  receiverCall: string;
  receiverUid: string;
  // Group info
  groupId?: string;
  groupNumber?: number;
  // Radio setup info
  radioMake?: string;
  radioModel?: string;
  antenna?: string;
  radioDescription?: string;
  // Location info
  location?: Location;
  // Repeater/Simplex info
  useRepeater: boolean;
  repeaterCallSign?: string;
  repeaterFrequency?: string;
  simplexFrequency?: string;
  createdAt: Timestamp | Date;
}
