import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp
} from '@angular/fire/firestore';
import { Invitation } from '../models/signal-report.model';

@Injectable({
  providedIn: 'root'
})
export class InvitationService {
  private firestore = inject(Firestore);

  private generateToken(): string {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async createInvitations(emails: string[], inviterUid: string, inviterEmail: string): Promise<Invitation[]> {
    const invitationsRef = collection(this.firestore, 'invitations');
    const createdInvitations: Invitation[] = [];

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim();
      if (!normalizedEmail) continue;

      // Check if invitation already exists for this email
      const existingQuery = query(
        invitationsRef,
        where('email', '==', normalizedEmail),
        where('status', '==', 'pending')
      );
      const existingSnap = await getDocs(existingQuery);

      if (!existingSnap.empty) {
        // Return existing invitation
        const existingDoc = existingSnap.docs[0];
        createdInvitations.push({
          id: existingDoc.id,
          ...existingDoc.data()
        } as Invitation);
        continue;
      }

      const token = this.generateToken();
      const invitation: Omit<Invitation, 'id'> = {
        email: normalizedEmail,
        inviterUid,
        inviterEmail,
        token,
        status: 'pending',
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(invitationsRef, invitation);
      createdInvitations.push({
        id: docRef.id,
        ...invitation
      });
    }

    return createdInvitations;
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const invitationsRef = collection(this.firestore, 'invitations');
    const tokenQuery = query(invitationsRef, where('token', '==', token));
    const snapshot = await getDocs(tokenQuery);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as Invitation;
  }

  async acceptInvitation(token: string, uid: string): Promise<Invitation | null> {
    const invitation = await this.getInvitationByToken(token);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer valid');
    }

    // Update invitation status
    const invitationRef = doc(this.firestore, 'invitations', invitation.id);
    await updateDoc(invitationRef, {
      status: 'accepted',
      acceptedByUid: uid,
      acceptedAt: Timestamp.now()
    });

    return {
      ...invitation,
      status: 'accepted'
    };
  }

  async getPendingInvitations(inviterUid: string): Promise<Invitation[]> {
    const invitationsRef = collection(this.firestore, 'invitations');
    const pendingQuery = query(
      invitationsRef,
      where('inviterUid', '==', inviterUid),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(pendingQuery);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Invitation));
  }

  async getAllPendingInvitations(): Promise<Invitation[]> {
    const invitationsRef = collection(this.firestore, 'invitations');
    const pendingQuery = query(invitationsRef, where('status', '==', 'pending'));
    const snapshot = await getDocs(pendingQuery);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Invitation));
  }

  buildInviteUrl(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/accept-invite/${token}`;
  }
}
