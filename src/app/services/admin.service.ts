import { Injectable, inject, signal } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private firestore = inject(Firestore);

  private adminEmails = signal<string[]>([]);
  private configLoaded = signal(false);

  async loadAdminConfig(): Promise<void> {
    if (this.configLoaded()) return;

    try {
      const configRef = doc(this.firestore, 'config', 'admin');
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        const data = configSnap.data();
        this.adminEmails.set(data['adminEmails'] || []);
      } else {
        // Default admin emails if config doesn't exist
        this.adminEmails.set(['matt.n3pay@gmail.com', 'jim.kx0u@gmail.com']);
      }
      this.configLoaded.set(true);
    } catch (error) {
      console.error('Error loading admin config:', error);
      // Fallback to default
      this.adminEmails.set(['matt.n3pay@gmail.com', 'jim.kx0u@gmail.com']);
      this.configLoaded.set(true);
    }
  }

  isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    return this.adminEmails().includes(email.toLowerCase());
  }

  getAdminEmails(): string[] {
    return this.adminEmails();
  }
}
