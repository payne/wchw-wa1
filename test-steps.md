# Test Steps for WCHW Signal Logger

This document describes the steps to test all features of the application.

## Test Data

- **Receiver (logged-in user)**: N3PAY
- **Test transmitter callsigns**: KX0U, KF0VWD, KF0SLC, KF0UWE, KD0NMD

## Prerequisites

1. Open https://wchw1-f9f49.web.app in a browser
2. Sign in with Google account

---

## Test 1: User Profile Setup

### 1.1 Set Call Sign
1. After signing in, a dialog should prompt for call sign (if first time)
2. Enter: `N3PAY`
3. Click Save
4. **Expected**: Dialog closes, call sign is saved

### 1.2 Verify Call Sign in Configure
1. Navigate to **Configure** page
2. **Expected**: Call sign field shows `N3PAY`

---

## Test 2: Location Management

### 2.1 Add a Location
1. Navigate to **Configure** page
2. Scroll to **Locations** section
3. Enter Nickname: `Home QTH`
4. Enter Address: `123 Main St, Denver, CO`
5. Click **Use Current** button (or manually enter lat/long)
6. Click **Add Location**
7. **Expected**: Location appears in the grid

### 2.2 Set Current Location
1. Select `Home QTH` from the "Currently Active Location" dropdown
2. **Expected**: Snackbar shows "Active location updated"

### 2.3 Edit a Location
1. Click on a row in the Locations grid
2. Modify the nickname to `Home QTH - Updated`
3. Click **Update**
4. **Expected**: Grid updates with new nickname

---

## Test 3: Radio Setup Management

### 3.1 Add a Radio Setup
1. Navigate to **Configure** page
2. Scroll to **Radio Setups** section
3. Enter:
   - Nickname: `HT`
   - Make: `Yaesu`
   - Model: `FT-60R`
   - Antenna: `Stock rubber duck`
   - Description: `Handheld for portable ops`
4. Click **Add Radio Setup**
5. **Expected**: Radio appears in the grid

### 3.2 Set Current Radio
1. Select `HT` from the "Currently Active Radio" dropdown
2. **Expected**: Snackbar shows "Active radio updated"

### 3.3 Add Another Radio
1. Add another radio:
   - Nickname: `Mobile`
   - Make: `Kenwood`
   - Model: `TM-V71A`
   - Antenna: `Mag mount`
4. Click **Add Radio Setup**
5. **Expected**: Second radio appears in grid

---

## Test 4: Frequency Mode Configuration

### 4.1 Set Simplex Mode
1. Navigate to **Configure** page
2. In **Frequency Mode** section, select **Simplex**
3. Enter frequency: `146.52`
4. Click **Save Frequency Settings**
5. **Expected**: Settings saved confirmation

### 4.2 Set Repeater Mode
1. Select **Repeater**
2. Enter Repeater Call Sign: `W0JJK`
3. Enter Repeater Frequency: `145.235`
4. Click **Save Frequency Settings**
5. **Expected**: Settings saved confirmation

### 4.3 Add Repeater to List
1. With repeater info filled in, click **Add to Repeater List**
2. **Expected**: Repeater added to shared database

---

## Test 5: Group Management

### 5.1 Create a Group
1. Navigate to **Configure** page
2. Scroll to **Signal Report Groups** section
3. Enter Nickname: `Field Day 2026`
4. Click **Create Group**
5. **Expected**: Group #1 appears in grid, auto-selected as current

### 5.2 Create Another Group
1. Enter Nickname: `Weekly Net`
2. Click **Create Group**
3. **Expected**: Group #2 appears in grid

### 5.3 Edit Group Nickname
1. Click on Group #1 row in the grid
2. Change nickname to `Field Day 2026 - 2A`
3. Click **Update Nickname**
4. **Expected**: Grid updates with new nickname

### 5.4 Set Current Group
1. Select `#1 - Field Day 2026 - 2A` from dropdown
2. **Expected**: Snackbar shows "Active group updated"

---

## Test 6: Submit Signal Reports

### 6.1 Submit First Report
1. Navigate to **Home** page
2. Enter Transmitter's Call: `KX0U`
3. Enter Signal Heard: `59`
4. Verify Time is auto-populated
5. Click **Submit Report**
6. **Expected**:
   - Report appears in table
   - Report appears on map (if locations available)

### 6.2 Submit Additional Reports
Repeat for each transmitter:

| Transmitter | Signal |
|-------------|--------|
| KF0VWD      | 57     |
| KF0SLC      | 55     |
| KF0UWE      | 59+    |
| KD0NMD      | 53     |

### 6.3 Verify Table Display
1. All 5 reports should appear in table
2. Each row should show: Transmitter Call, Signal, Time, Receiver (N3PAY), Distance
3. **Expected**: Distance shows miles (or "—" if callsign not in HamDB)

---

## Test 7: Expandable Rows

### 7.1 Expand Single Row
1. Click the chevron icon on any row
2. **Expected**: Row expands to show:
   - Frequency info (Repeater or Simplex)
   - Radio info (make/model)
   - Antenna
   - Location

### 7.2 Expand Multiple Rows
1. Expand 2-3 rows
2. **Expected**: Multiple rows can be expanded simultaneously

### 7.3 Expand All
1. Click the **unfold_more** icon in table header
2. **Expected**: All rows expand

### 7.4 Collapse All
1. Click the **unfold_less** icon in table header
2. **Expected**: All rows collapse

---

## Test 8: Map Functionality

### 8.1 View Map
1. Navigate to **Home** page
2. Map should be visible above or below table
3. **Expected**:
   - Station markers visible for callsigns with HamDB data
   - Blue markers = reported locations
   - Purple markers = FCC lookup locations

### 8.2 View Signal Paths
1. **Expected**: Lines connecting stations that have communicated
   - Green lines = simplex contacts
   - Orange lines = repeater contacts

### 8.3 Layer Controls
1. Use layer control (top right of map) to toggle:
   - Stations (Reported)
   - Stations (FCC Lookup)
   - Simplex Paths
   - Repeater Paths
2. **Expected**: Each layer toggles independently

### 8.4 Station Popups
1. Click on a station marker
2. **Expected**: Popup shows callsign, location source, and report counts

### 8.5 Path Popups
1. Click on a signal path line
2. **Expected**: Popup shows callsigns, signal strength, report count

### 8.6 Swap Map/Table Position
1. Click **Show Table First** / **Show Map First** button
2. **Expected**: Map and table positions swap

---

## Test 9: Data Export

### 9.1 Export All Data as CSV
1. Navigate to **Configure** page
2. Scroll to **Export Data** section
3. Click **Download All (CSV)**
4. **Expected**: CSV file downloads with all signal reports

### 9.2 Export All Data as JSON
1. Click **Download All (JSON)**
2. **Expected**: JSON file downloads with all signal reports

### 9.3 Export Group Data
1. Select a group from the dropdown
2. Click **Download Group (CSV)**
3. **Expected**: CSV file downloads with only that group's reports

### 9.4 Verify Export Contents
Open downloaded file and verify fields:
- transmitterCall
- signalHeard
- time
- receiverCall
- groupNumber
- frequency
- frequencyType
- radioMake
- radioModel
- antenna
- locationAddress
- locationLat
- locationLong

---

## Test 10: Offline Functionality (PWA)

### 10.1 Install as PWA
1. In Chrome, click the install icon in address bar
2. **Expected**: App installs as standalone application

### 10.2 Offline Data Viewing
1. Disconnect from network
2. Open app
3. **Expected**: Previously loaded data still visible

### 10.3 Offline Report Submission
1. While offline, submit a signal report
2. **Expected**: Report queued for sync
3. Reconnect to network
4. **Expected**: Report syncs to Firestore

---

## Test 11: Callsign Lookup Caching

### 11.1 Verify Caching
1. Open browser DevTools > Application > Local Storage
2. Look for key: `wchw_callsign_cache`
3. **Expected**: Contains cached callsign lookup data

### 11.2 Cache Persistence
1. Refresh the page
2. **Expected**: Distance calculations should be faster (using cached data)

---

## Test 12: Edge Cases

### 12.1 Invalid Callsign
1. Submit report with transmitter: `INVALID123`
2. **Expected**: Report saves, distance shows "—"

### 12.2 Empty Required Fields
1. Try to submit with empty Transmitter's Call
2. **Expected**: Submit button disabled

### 12.3 No Current Group
1. Set current group to "-- None Selected --"
2. Submit a report
3. **Expected**: Report saves without group assignment

---

## Test Results Checklist

| Test | Description | Pass/Fail | Notes |
|------|-------------|-----------|-------|
| 1.1 | Set Call Sign | | |
| 1.2 | Verify Call Sign | | |
| 2.1 | Add Location | | |
| 2.2 | Set Current Location | | |
| 2.3 | Edit Location | | |
| 3.1 | Add Radio Setup | | |
| 3.2 | Set Current Radio | | |
| 3.3 | Add Another Radio | | |
| 4.1 | Set Simplex Mode | | |
| 4.2 | Set Repeater Mode | | |
| 4.3 | Add Repeater to List | | |
| 5.1 | Create Group | | |
| 5.2 | Create Another Group | | |
| 5.3 | Edit Group Nickname | | |
| 5.4 | Set Current Group | | |
| 6.1 | Submit First Report | | |
| 6.2 | Submit Additional Reports | | |
| 6.3 | Verify Table Display | | |
| 7.1 | Expand Single Row | | |
| 7.2 | Expand Multiple Rows | | |
| 7.3 | Expand All | | |
| 7.4 | Collapse All | | |
| 8.1 | View Map | | |
| 8.2 | View Signal Paths | | |
| 8.3 | Layer Controls | | |
| 8.4 | Station Popups | | |
| 8.5 | Path Popups | | |
| 8.6 | Swap Map/Table | | |
| 9.1 | Export All CSV | | |
| 9.2 | Export All JSON | | |
| 9.3 | Export Group Data | | |
| 9.4 | Verify Export Contents | | |
| 10.1 | Install as PWA | | |
| 10.2 | Offline Data Viewing | | |
| 10.3 | Offline Report Submission | | |
| 11.1 | Verify Caching | | |
| 11.2 | Cache Persistence | | |
| 12.1 | Invalid Callsign | | |
| 12.2 | Empty Required Fields | | |
| 12.3 | No Current Group | | |
