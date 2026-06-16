import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  addDoc,
  query,
  orderBy,
  Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { SignalReport, UserProfile } from '../models/signal-report.model';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore = inject(Firestore);

  getSignalReports(): Observable<SignalReport[]> {
    const reportsRef = collection(this.firestore, 'signalReports');
    const reportsQuery = query(reportsRef, orderBy('time', 'desc'));
    return collectionData(reportsQuery, { idField: 'id' }) as Observable<SignalReport[]>;
  }

  async addSignalReport(report: Omit<SignalReport, 'id' | 'createdAt'>): Promise<string> {
    const reportsRef = collection(this.firestore, 'signalReports');
    const docRef = await addDoc(reportsRef, {
      ...report,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(this.firestore, 'users', uid);
    const { getDoc } = await import('@angular/fire/firestore');
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  }

  async setUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
    const userRef = doc(this.firestore, 'users', uid);
    await setDoc(userRef, {
      ...profile,
      updatedAt: Timestamp.now()
    }, { merge: true });
  }
}
