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
  Timestamp,
  where,
  getDocs
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { SignalReport, UserProfile, RepeaterInfo } from '../models/signal-report.model';

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

  // Repeaters collection - shared across all users
  async getRepeaters(): Promise<RepeaterInfo[]> {
    const repeatersRef = collection(this.firestore, 'repeaters');
    const repeatersQuery = query(repeatersRef, orderBy('callSign'));
    const snapshot = await getDocs(repeatersQuery);
    return snapshot.docs.map(doc => doc.data() as RepeaterInfo);
  }

  async searchRepeaters(searchTerm: string): Promise<RepeaterInfo[]> {
    // Since Firestore doesn't support partial text search natively,
    // we'll fetch all repeaters and filter client-side
    const allRepeaters = await this.getRepeaters();
    const term = searchTerm.toLowerCase();
    return allRepeaters.filter(r =>
      r.callSign.toLowerCase().includes(term) ||
      r.frequency.includes(term)
    );
  }

  async addRepeater(repeater: RepeaterInfo): Promise<void> {
    const repeatersRef = collection(this.firestore, 'repeaters');
    // Use callSign + frequency as the document ID to prevent duplicates
    const docId = `${repeater.callSign}_${repeater.frequency}`.replace(/[^a-zA-Z0-9]/g, '_');
    const repeaterDoc = doc(this.firestore, 'repeaters', docId);
    await setDoc(repeaterDoc, repeater);
  }
}
