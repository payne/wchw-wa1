import { Timestamp } from '@angular/fire/firestore';

export interface RadioSetup {
  id: string;
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
  location?: Location;
  useRepeater: boolean;
  repeaterInfo?: RepeaterInfo;
  simplexFrequency: string;
  updatedAt: Timestamp | Date;
}

export interface SignalReport {
  id?: string;
  transmitterCall: string;
  signalHeard: string;
  time: Timestamp | Date;
  receiverCall: string;
  receiverUid: string;
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
