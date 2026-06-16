import { Timestamp } from '@angular/fire/firestore';

export interface SignalReport {
  id?: string;
  transmitterCall: string;
  signalHeard: string;
  time: Timestamp | Date;
  receiverCall: string;
  receiverUid: string;
  createdAt: Timestamp | Date;
}

export interface UserProfile {
  callSign: string;
  email: string;
  displayName: string;
  updatedAt: Timestamp | Date;
}
