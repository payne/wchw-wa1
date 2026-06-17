import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { Firestore, doc, getDoc, collection, getDocs } from '@angular/fire/firestore';
import { map, take, switchMap, from } from 'rxjs';
import { AdminService } from '../services/admin.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const firestore = inject(Firestore);
  const adminService = inject(AdminService);

  return user(auth).pipe(
    take(1),
    switchMap(async (currentUser) => {
      if (!currentUser) {
        router.navigate(['/about']);
        return false;
      }

      // Load admin config first
      await adminService.loadAdminConfig();

      // Check if user is admin
      if (adminService.isAdmin(currentUser.email)) {
        return true;
      }

      // Check if user has been invited
      const userRef = doc(firestore, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData['invitedByUid']) {
          return true;
        }
      }

      // Check if open groups exist
      const openGroupsRef = collection(firestore, 'openGroups');
      const openGroupsSnap = await getDocs(openGroupsRef);

      if (!openGroupsSnap.empty) {
        router.navigate(['/open-groups']);
        return false;
      }

      // No open groups, redirect to notification signup
      router.navigate(['/no-open-groups']);
      return false;
    })
  );
};

// Guard for routes that only uninvited users should access
export const uninvitedOnlyGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const firestore = inject(Firestore);
  const adminService = inject(AdminService);

  return user(auth).pipe(
    take(1),
    switchMap(async (currentUser) => {
      if (!currentUser) {
        router.navigate(['/about']);
        return false;
      }

      // Load admin config
      await adminService.loadAdminConfig();

      // If admin, redirect to home
      if (adminService.isAdmin(currentUser.email)) {
        router.navigate(['/home']);
        return false;
      }

      // If invited, redirect to home
      const userRef = doc(firestore, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData['invitedByUid']) {
          router.navigate(['/home']);
          return false;
        }
      }

      // User is uninvited, allow access
      return true;
    })
  );
};
