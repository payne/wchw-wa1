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

### Feature: Interactive Signal Map
- **Request**: Add Leaflet/OpenStreetMap map to visualize stations and signal paths with layer controls
- **Actions Taken**:
  - Installed Leaflet and @types/leaflet
  - Added Leaflet CSS to styles.scss
  - Created standalone SignalMapComponent with:
    - OpenStreetMap tile layer
    - Station markers showing receiver locations with call sign tooltips and popups
    - Signal path polylines connecting stations that have communicated
    - Green lines for simplex contacts, orange lines for repeater contacts
    - Line thickness increases with more reports between stations
    - Popup info showing call signs, signal strength, report count, and frequency mode
    - Layer control to toggle: Stations, Simplex Paths, Repeater Paths
    - Auto-fit bounds to show all stations
    - Legend showing marker and line meanings
  - Added map to Home component between form and grid
  - Component is standalone for easy reuse/relocation
  - Deployed to Firebase

### Feature: Swappable Map/Table Positions
- **Request**: Allow map and table positions to be swapped
- **Action**: Added toggle button using ng-template to swap display order of map and table cards

### Feature: Callsign Location Lookup
- **Request**: Use HamDB.org API to locate callsigns on map; use localStorage to cache results
- **Actions Taken**:
  - Created CallsignLookupService with:
    - HamDB.org API integration for callsign location lookup
    - Memory cache for fast repeated lookups
    - localStorage persistence with 30-day expiry
    - Batch lookup support with rate limiting
  - Updated SignalMapComponent:
    - Blue markers for stations with reported locations
    - Purple markers for stations with FCC lookup locations
    - Separate layer controls for reported vs lookup stations
    - Loading indicator while looking up callsigns
    - Updated legend to show both marker types
  - Deployed to Firebase

### Feature: Expandable Table Rows
- **Request**: Add expandable rows to signal reports table; show basic info collapsed, details on expand
- **Actions Taken**:
  - Updated Home component AG Grid with expandable rows:
    - Rows start collapsed showing: Transmitter's Call, Signal Heard, Time, Receiver's Call, Distance
    - Expand/collapse button in first column (click to toggle)
    - Expanded rows show: Frequency (repeater or simplex), Radio (make/model), Antenna, Location
    - Multiple rows can be expanded simultaneously
    - Expand All / Collapse All buttons in table header
  - Added distance calculation using Haversine formula:
    - Calculates distance in miles between transmitter (via HamDB lookup) and receiver locations
    - Displays "—" when location data unavailable
  - Styled expanded content with visual distinction (blue left border, light background)
  - Deployed to Firebase

### Feature: Signal Report Groups
- **Request**: Add groups for organizing signal reports; groups have system-assigned numbers and user-editable nicknames
- **Actions Taken**:
  - Added SignalGroup model with id, groupNumber (system-assigned), nickname, createdAt
  - Updated UserProfile model to include groups array and currentGroupId
  - Updated SignalReport model to include groupId and groupNumber
  - Added group management methods to UserProfileService:
    - addGroup (auto-assigns next group number)
    - updateGroupNickname
    - deleteGroup
    - setCurrentGroup
  - Updated Home component to include group info when submitting reports
  - Updated Configure component with:
    - Groups section with AG Grid listing all groups
    - Current group dropdown selector
    - Create new group form (nickname only, number assigned automatically)
    - Edit group nickname / delete group
  - Deployed to Firebase

### Feature: Data Export
- **Request**: Add ability to download signal report data as CSV or JSON
- **Actions Taken**:
  - Added Export Data section to Configure component
  - Export All Data: Download all signal reports as CSV or JSON
  - Export Single Group: Select a group and download its reports as CSV or JSON
  - Export includes: transmitterCall, signalHeard, time, receiverCall, groupNumber, frequency, frequencyType, radioMake, radioModel, antenna, locationAddress, locationLat, locationLong
  - Deployed to Firebase

### Bug Fix: Distance Calculation
- **Issue**: Distance not showing in table
- **Fixes**:
  - Added colId to Distance column for proper grid refresh
  - Fixed valueGetter this binding with separate getDistance method
  - Updated to look up BOTH transmitter and receiver QTH from HamDB (not just transmitter)
  - Distance now calculated from FCC-registered addresses of both stations
  - Deployed to Firebase

### Documentation: Test Steps
- **Request**: Create test-steps.md with comprehensive test procedures
- **Actions Taken**:
  - Created test-steps.md with 12 test sections covering all features
  - Test callsigns: N3PAY (receiver), KX0U, KF0VWD, KF0SLC, KF0UWE, KD0NMD (transmitters)
  - Includes test results checklist
  - Committed and pushed to repository

### Playwright End-to-End Tests
- **Request**: Create Playwright tests for all test scenarios
- **Actions Taken**:
  - Installed Playwright with Chromium, Firefox, and WebKit browsers
  - Created e2e/ directory with test files:
    - `fixtures.ts` - Shared test data and helper functions
    - `auth.spec.ts` - Authentication flow tests
    - `home.spec.ts` - Home page, form, and table tests
    - `configure.spec.ts` - Configure page section tests
    - `map.spec.ts` - Leaflet map functionality tests
    - `navigation.spec.ts` - Page navigation tests
    - `signal-reports.spec.ts` - AG Grid table and expandable rows tests
    - `pwa.spec.ts` - PWA features, offline support, responsive design tests
  - Added npm scripts: e2e, e2e:ui, e2e:headed, e2e:debug, e2e:report
  - Tests run against deployed app at https://wchw1-f9f49.web.app
  - Committed and pushed to repository

## 2026-06-17

### Feature: Command-Line Interface (CLI)
- **Request**: Create a Deno CLI tool for logging signal reports from terminal
- **Actions Taken**:
  - Created cli/ directory with full Deno TypeScript implementation:
    - `deps.ts` - Standard library imports (flags, fs, path, http/server)
    - `config.ts` - Configuration storage in ~/.wchw/ with OAuth credential management
    - `auth.ts` - Google OAuth 2.0 flow with browser login and localhost callback
    - `firestore.ts` - Firestore REST API integration for adding signal reports
    - `main.ts` - CLI entry point with command handling
    - `deno.json` - Build tasks for compilation
    - `README.md` - Comprehensive documentation
  - CLI Commands:
    - `lsr login` - Google OAuth authentication via browser
    - `lsr logout` - Sign out
    - `lsr status` - Show current login and settings
    - `lsr setup` - Configure OAuth credentials (client ID, secret, Firebase API key)
    - `lsr config` - Show/set configuration (call sign, group, simplex/repeater mode)
    - `lsr groups` - List available groups
    - `lsr <callsign> <signal>` - Log a signal report
  - Cross-platform compilation targets: Linux, Windows, macOS Intel, macOS ARM
  - Standalone executable (~82MB) requires no runtime dependencies
  - Added compiled binaries to .gitignore
