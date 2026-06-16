# Interaction Log

## 2026-06-16

### Session Start
- **Request**: Set up interaction tracking for all Claude sessions in this folder
- **Action**: Created `interactions.md` and `CLAUDE.md` to enable automatic tracking

### Angular PWA Implementation
- **Request**: Implement Angular Material PWA for logging radio signal observations per detailed plan
- **Actions Taken**:
  - Initialized Angular 19 project with routing and SCSS
  - Added Angular Material (azure-blue theme), Angular PWA, Firebase/AngularFire, and AG Grid Community
  - Created Firebase web app and configured environment.ts with SDK config
  - Implemented services: AuthService (Google auth), FirestoreService (CRUD with offline), UserProfileService (call sign management)
  - Created components: NavMenu, Home (form + AG Grid), About, Configure, CallSignDialog
  - Set up auth guard for route protection
  - Updated firestore.rules with proper security (users can only access own profile, authenticated users can read/create reports)
  - Updated firebase.json hosting path to dist/wchw-wa1-app/browser
  - Updated PWA manifest and index.html with proper app metadata
  - Build successful (ng build)

### Bug Fix: AG Grid dispatchEvent Error
- **Issue**: Submit button threw "Cannot read properties of undefined (reading 'dispatchEvent')" error
- **Root Cause**: AG Grid v35 requires explicit module registration
- **Fix**:
  - Added `ModuleRegistry.registerModules([AllCommunityModule])` to home component
  - Changed from `AgGridModule` to `AgGridAngular` component import
  - Updated theme from `ag-theme-material` to `ag-theme-quartz`
  - Added AG Grid CSS imports to styles.scss
  - Changed rowData from signal to regular array to avoid change detection conflicts
  - Redeployed to Firebase
