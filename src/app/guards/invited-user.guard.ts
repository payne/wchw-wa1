import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { take, switchMap } from 'rxjs';
import { AdminService } from '../services/admin.service';

// Guard that only allows admins and invited users
export const invitedUserGuard: CanActivateFn = () => {
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

      // Admins always have access
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

      // Not invited, redirect to home (which will redirect appropriately)
      router.navigate(['/home']);
      return false;
    })
  );
};
