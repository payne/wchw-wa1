import { Routes } from '@angular/router';
import { authGuard, uninvitedOnlyGuard } from './guards/auth.guard';
import { invitedUserGuard } from './guards/invited-user.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuard]
  },
  {
    path: 'about',
    loadComponent: () => import('./components/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'configure',
    loadComponent: () => import('./components/configure/configure.component').then(m => m.ConfigureComponent),
    canActivate: [authGuard]
  },
  {
    path: 'group-members',
    loadComponent: () => import('./components/group-members/group-members.component').then(m => m.GroupMembersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'accept-invite/:token',
    loadComponent: () => import('./components/accept-invitation/accept-invitation.component').then(m => m.AcceptInvitationComponent)
  },
  {
    path: 'no-open-groups',
    loadComponent: () => import('./components/no-open-groups/no-open-groups.component').then(m => m.NoOpenGroupsComponent),
    canActivate: [uninvitedOnlyGuard]
  },
  {
    path: 'open-groups',
    loadComponent: () => import('./components/open-groups-list/open-groups-list.component').then(m => m.OpenGroupsListComponent),
    canActivate: [uninvitedOnlyGuard]
  },
  {
    path: 'invite',
    loadComponent: () => import('./components/invite-users/invite-users.component').then(m => m.InviteUsersComponent),
    canActivate: [invitedUserGuard]
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
