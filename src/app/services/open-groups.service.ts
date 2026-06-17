import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  Timestamp
} from '@angular/fire/firestore';
import { OpenGroup, OpenGroupNotification, SignalGroup } from '../models/signal-report.model';

@Injectable({
  providedIn: 'root'
})
export class OpenGroupsService {
  private firestore = inject(Firestore);

  readonly openGroups = signal<OpenGroup[]>([]);
  readonly isLoading = signal(false);

  async loadOpenGroups(): Promise<OpenGroup[]> {
    this.isLoading.set(true);
    try {
      const openGroupsRef = collection(this.firestore, 'openGroups');
      const openGroupsQuery = query(openGroupsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(openGroupsQuery);

      const groups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OpenGroup));

      this.openGroups.set(groups);
      return groups;
    } catch (error) {
      console.error('Error loading open groups:', error);
      return [];
    } finally {
      this.isLoading.set(false);
    }
  }

  async addOpenGroup(
    group: SignalGroup,
    ownerUid: string,
    ownerCallSign: string
  ): Promise<void> {
    const openGroupRef = doc(this.firestore, 'openGroups', group.id);
    await setDoc(openGroupRef, {
      groupId: group.id,
      groupNumber: group.groupNumber,
      nickname: group.nickname,
      ownerUid,
      ownerCallSign,
      createdAt: Timestamp.now()
    });
  }

  async removeOpenGroup(groupId: string): Promise<void> {
    const openGroupRef = doc(this.firestore, 'openGroups', groupId);
    await deleteDoc(openGroupRef);
  }

  async subscribeToNotification(email: string, uid: string): Promise<void> {
    const notificationsRef = collection(this.firestore, 'openGroupNotifications');
    await addDoc(notificationsRef, {
      email: email.toLowerCase(),
      uid,
      createdAt: Timestamp.now()
    });
  }

  async hasOpenGroups(): Promise<boolean> {
    const groups = await this.loadOpenGroups();
    return groups.length > 0;
  }
}
