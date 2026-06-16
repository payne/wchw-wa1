import { Injectable, inject, signal, computed } from '@angular/core';
import { Auth, signInWithPopup, signOut, GoogleAuthProvider, user, User } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private googleProvider = new GoogleAuthProvider();

  readonly user$ = user(this.auth);
  readonly currentUser = toSignal(this.user$, { initialValue: null });
  readonly isAuthenticated = computed(() => !!this.currentUser());

  async signInWithGoogle(): Promise<User | null> {
    try {
      const result = await signInWithPopup(this.auth, this.googleProvider);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }
}
