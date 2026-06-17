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

### UI Enhancement: Form Field Order
- **Request**: Swap time field and submit button positions
- **Action**: Moved Submit Report button before Time field since auto-populated time rarely needs modification

### Feature: Enhanced Configuration Screen
- **Request**: Add radio setup management, location tracking, and repeater/simplex mode to configuration
- **Actions Taken**:
  - Updated models: Added RadioSetup, Location, RepeaterInfo interfaces; expanded UserProfile and SignalReport
  - Enhanced UserProfileService with methods for radio setups, location, and repeater mode
  - Added repeaters collection to Firestore for shared repeater database
  - Rebuilt Configure component with:
    - Radio setups AG Grid (sortable/filterable) with add/edit/delete
    - Quick-switch dropdown for active radio
    - Location fields (address + lat/long) with "Use Current Location" geolocation button
    - Repeater/Simplex toggle with searchable repeater autocomplete
    - Ability to add new repeaters to shared database
  - Updated Home component to bind all configuration data to signal reports
  - Added Frequency and Radio columns to signal reports grid
  - Updated firestore.rules to allow repeaters collection access
  - Deployed to Firebase

### Bug Fix: Firestore undefined field error
- **Issue**: Submit report failed with "Unsupported field value: undefined" error
- **Fix**: Updated submitReport to build report object incrementally, only including fields with actual values

### Feature: Nicknames for Radio Setups and Locations
- **Request**: Add nicknames to radio setups and locations; select current by nickname dropdown
- **Actions Taken**:
  - Added `nickname` field to RadioSetup model
  - Added `SavedLocation` interface with id, nickname, address, lat/long
  - Updated UserProfile to use savedLocations[] and currentLocationId instead of single location
  - Updated UserProfileService with addLocation, updateLocation, deleteLocation, setCurrentLocation methods
  - Updated Configure component:
    - Radio dropdown now shows nickname only
    - Added nickname field to radio form (required)
    - Added Locations section with AG Grid (sortable/filterable), dropdown for current location
    - Location form with nickname, address, lat/long, and "Use Current" geolocation button
  - Deployed to Firebase
