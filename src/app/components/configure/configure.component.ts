import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GridApi, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { UserProfileService } from '../../services/user-profile.service';
import { FirestoreService } from '../../services/firestore.service';
import { RadioSetup, SavedLocation, RepeaterInfo, Location, SignalGroup, SignalReport } from '../../models/signal-report.model';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-configure',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatRadioModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatDividerModule,
    MatTooltipModule,
    AgGridAngular
  ],
  template: `
    <div class="configure-container">
      <!-- Call Sign Section -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>Operator Information</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Call Sign</mat-label>
              <input matInput [(ngModel)]="newCallSign" placeholder="e.g., W1ABC">
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="saveCallSign()"
                    [disabled]="!canSaveCallSign()">
              <mat-icon>save</mat-icon> Save
            </button>
          </div>

          @if (authService.currentUser(); as user) {
            <p class="account-info"><strong>Email:</strong> {{ user.email }}</p>
          }
        </mat-card-content>
      </mat-card>

      <!-- Location Section -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>Locations</mat-card-title>
          <mat-card-subtitle>Manage your operating locations</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <!-- Current Location Selection -->
          @if (userProfileService.savedLocations().length > 0) {
            <div class="form-row current-radio">
              <mat-form-field appearance="outline" class="flex-2">
                <mat-label>Currently Active Location</mat-label>
                <mat-select [(ngModel)]="selectedLocationId" (ngModelChange)="setCurrentLocation($event)">
                  <mat-option [value]="null">-- None Selected --</mat-option>
                  @for (loc of userProfileService.savedLocations(); track loc.id) {
                    <mat-option [value]="loc.id">
                      {{ loc.nickname }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            <mat-divider></mat-divider>
          }

          <!-- Locations Grid -->
          <div class="grid-container">
            <ag-grid-angular
              class="ag-theme-quartz"
              [rowData]="savedLocations()"
              [columnDefs]="locationColumnDefs"
              [defaultColDef]="defaultColDef"
              [rowSelection]="'single'"
              [domLayout]="'autoHeight'"
              (gridReady)="onLocationGridReady($event)"
              (rowClicked)="onLocationRowClicked($event)">
            </ag-grid-angular>
          </div>

          <mat-divider></mat-divider>

          <!-- Add/Edit Location Form -->
          <h4>{{ editingLocation ? 'Edit' : 'Add' }} Location</h4>
          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-2">
              <mat-label>Nickname</mat-label>
              <input matInput [(ngModel)]="locationForm.nickname" placeholder="e.g., Home QTH">
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-2">
              <mat-label>Address</mat-label>
              <input matInput [(ngModel)]="locationForm.address"
                     placeholder="123 Main St, City, State ZIP">
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Latitude</mat-label>
              <input matInput type="number" [(ngModel)]="locationForm.latitude" step="0.000001">
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Longitude</mat-label>
              <input matInput type="number" [(ngModel)]="locationForm.longitude" step="0.000001">
            </mat-form-field>
            <button mat-raised-button (click)="useCurrentGeoLocation()"
                    [disabled]="isGettingLocation()">
              <mat-icon>my_location</mat-icon>
              {{ isGettingLocation() ? 'Getting...' : 'Use Current' }}
            </button>
          </div>

          <div class="form-actions">
            @if (editingLocation) {
              <button mat-raised-button color="primary" (click)="updateLocationEntry()"
                      [disabled]="!canSaveLocation()">
                <mat-icon>save</mat-icon> Update
              </button>
              <button mat-stroked-button (click)="cancelLocationEdit()">Cancel</button>
              <button mat-stroked-button color="warn" (click)="deleteLocationEntry()">
                <mat-icon>delete</mat-icon> Delete
              </button>
            } @else {
              <button mat-raised-button color="primary" (click)="addLocationEntry()"
                      [disabled]="!canSaveLocation()">
                <mat-icon>add</mat-icon> Add Location
              </button>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Repeater/Simplex Section -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>Frequency Mode</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-radio-group [(ngModel)]="useRepeater" class="radio-group">
            <mat-radio-button [value]="false">Simplex</mat-radio-button>
            <mat-radio-button [value]="true">Repeater</mat-radio-button>
          </mat-radio-group>

          @if (!useRepeater) {
            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Simplex Frequency</mat-label>
                <input matInput [(ngModel)]="simplexFrequency" placeholder="146.52">
                <mat-hint>Default: 146.52 MHz</mat-hint>
              </mat-form-field>
            </div>
          } @else {
            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Search Repeater</mat-label>
                <input matInput [(ngModel)]="repeaterSearch"
                       (ngModelChange)="searchRepeaters($event)"
                       [matAutocomplete]="auto"
                       placeholder="Search by call sign or frequency (e.g., 235)">
                <mat-autocomplete #auto="matAutocomplete"
                                  (optionSelected)="selectRepeater($event.option.value)">
                  @for (repeater of filteredRepeaters(); track repeater.callSign + repeater.frequency) {
                    <mat-option [value]="repeater">
                      {{ repeater.callSign }} {{ repeater.frequency }}
                    </mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Repeater Call Sign</mat-label>
                <input matInput [(ngModel)]="repeaterCallSign" placeholder="e.g., W0JJK">
              </mat-form-field>
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Repeater Frequency</mat-label>
                <input matInput [(ngModel)]="repeaterFrequency" placeholder="e.g., 145.235">
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button mat-stroked-button (click)="addRepeaterToList()"
                      [disabled]="!repeaterCallSign || !repeaterFrequency">
                <mat-icon>add</mat-icon> Add to Repeater List
              </button>
            </div>
          }

          <div class="form-actions">
            <button mat-raised-button color="primary" (click)="saveFrequencyMode()">
              <mat-icon>save</mat-icon> Save Frequency Settings
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Radio Setups Section -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>Radio Setups</mat-card-title>
          <mat-card-subtitle>Manage your radio equipment configurations</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <!-- Current Radio Selection -->
          @if (userProfileService.radioSetups().length > 0) {
            <div class="form-row current-radio">
              <mat-form-field appearance="outline" class="flex-2">
                <mat-label>Currently Active Radio</mat-label>
                <mat-select [(ngModel)]="selectedRadioId" (ngModelChange)="setCurrentRadio($event)">
                  <mat-option [value]="null">-- None Selected --</mat-option>
                  @for (radio of userProfileService.radioSetups(); track radio.id) {
                    <mat-option [value]="radio.id">
                      {{ radio.nickname }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            <mat-divider></mat-divider>
          }

          <!-- Radio Setups Grid -->
          <div class="grid-container">
            <ag-grid-angular
              class="ag-theme-quartz"
              [rowData]="radioSetups()"
              [columnDefs]="radioColumnDefs"
              [defaultColDef]="defaultColDef"
              [rowSelection]="'single'"
              [domLayout]="'autoHeight'"
              (gridReady)="onGridReady($event)"
              (rowClicked)="onRadioRowClicked($event)">
            </ag-grid-angular>
          </div>

          <mat-divider></mat-divider>

          <!-- Add/Edit Radio Form -->
          <h4>{{ editingRadio ? 'Edit' : 'Add' }} Radio Setup</h4>
          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-2">
              <mat-label>Nickname</mat-label>
              <input matInput [(ngModel)]="radioForm.nickname" placeholder="e.g., Shack HF Rig">
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Make</mat-label>
              <input matInput [(ngModel)]="radioForm.make" placeholder="e.g., Yaesu">
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Model</mat-label>
              <input matInput [(ngModel)]="radioForm.model" placeholder="e.g., FT-991A">
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Antenna</mat-label>
              <input matInput [(ngModel)]="radioForm.antenna" placeholder="e.g., Diamond X50">
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput [(ngModel)]="radioForm.description" rows="3"
                      placeholder="Additional details about this setup..."></textarea>
          </mat-form-field>

          <div class="form-actions">
            @if (editingRadio) {
              <button mat-raised-button color="primary" (click)="updateRadio()"
                      [disabled]="!canSaveRadio()">
                <mat-icon>save</mat-icon> Update
              </button>
              <button mat-stroked-button (click)="cancelEdit()">Cancel</button>
              <button mat-stroked-button color="warn" (click)="deleteRadio()">
                <mat-icon>delete</mat-icon> Delete
              </button>
            } @else {
              <button mat-raised-button color="primary" (click)="addRadio()"
                      [disabled]="!canSaveRadio()">
                <mat-icon>add</mat-icon> Add Radio Setup
              </button>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Groups Section -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>Signal Report Groups</mat-card-title>
          <mat-card-subtitle>Organize your signal reports into groups</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <!-- Current Group Selection -->
          @if (userProfileService.groups().length > 0) {
            <div class="form-row current-radio">
              <mat-form-field appearance="outline" class="flex-2">
                <mat-label>Currently Active Group</mat-label>
                <mat-select [(ngModel)]="selectedGroupId" (ngModelChange)="setCurrentGroup($event)">
                  <mat-option [value]="null">-- None Selected --</mat-option>
                  @for (group of userProfileService.groups(); track group.id) {
                    <mat-option [value]="group.id">
                      #{{ group.groupNumber }} - {{ group.nickname }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            <mat-divider></mat-divider>
          }

          <!-- Groups Grid -->
          <div class="grid-container">
            <ag-grid-angular
              class="ag-theme-quartz"
              [rowData]="groups()"
              [columnDefs]="groupColumnDefs"
              [defaultColDef]="defaultColDef"
              [rowSelection]="'single'"
              [domLayout]="'autoHeight'"
              (gridReady)="onGroupGridReady($event)"
              (rowClicked)="onGroupRowClicked($event)">
            </ag-grid-angular>
          </div>

          <mat-divider></mat-divider>

          <!-- Add/Edit Group Form -->
          <h4>{{ editingGroup ? 'Edit' : 'Create New' }} Group</h4>
          @if (editingGroup) {
            <p class="group-number-display">Group Number: <strong>#{{ editingGroup.groupNumber }}</strong> (assigned by system)</p>
          }
          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-2">
              <mat-label>Group Nickname</mat-label>
              <input matInput [(ngModel)]="groupForm.nickname" placeholder="e.g., Field Day 2026">
            </mat-form-field>
          </div>

          <div class="form-actions">
            @if (editingGroup) {
              <button mat-raised-button color="primary" (click)="updateGroup()"
                      [disabled]="!canSaveGroup()">
                <mat-icon>save</mat-icon> Update Nickname
              </button>
              <button mat-stroked-button (click)="cancelGroupEdit()">Cancel</button>
              <button mat-stroked-button color="warn" (click)="deleteGroup()">
                <mat-icon>delete</mat-icon> Delete Group
              </button>
            } @else {
              <button mat-raised-button color="primary" (click)="addGroup()"
                      [disabled]="!canSaveGroup()">
                <mat-icon>add</mat-icon> Create Group
              </button>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Data Export Section -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>Export Data</mat-card-title>
          <mat-card-subtitle>Download signal reports as CSV or JSON</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="export-section">
            <h4>Export All Data</h4>
            <div class="form-actions">
              <button mat-raised-button (click)="exportAllData('csv')">
                <mat-icon>download</mat-icon> Download All (CSV)
              </button>
              <button mat-raised-button (click)="exportAllData('json')">
                <mat-icon>download</mat-icon> Download All (JSON)
              </button>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="export-section">
            <h4>Export Single Group</h4>
            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-2">
                <mat-label>Select Group to Export</mat-label>
                <mat-select [(ngModel)]="exportGroupId">
                  @for (group of userProfileService.groups(); track group.id) {
                    <mat-option [value]="group.id">
                      #{{ group.groupNumber }} - {{ group.nickname }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            <div class="form-actions">
              <button mat-raised-button (click)="exportGroupData('csv')"
                      [disabled]="!exportGroupId">
                <mat-icon>download</mat-icon> Download Group (CSV)
              </button>
              <button mat-raised-button (click)="exportGroupData('json')"
                      [disabled]="!exportGroupId">
                <mat-icon>download</mat-icon> Download Group (JSON)
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .configure-container {
      padding: 16px;
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .full-width { width: 100%; }
    .form-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
    .account-info {
      margin: 8px 0;
      color: #666;
    }
    .radio-group {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
    }
    .grid-container {
      margin: 16px 0;
      min-height: 150px;
    }
    .current-radio {
      margin-bottom: 16px;
    }
    mat-divider {
      margin: 16px 0;
    }
    h4 {
      margin: 16px 0 8px 0;
      color: #333;
    }
    .group-number-display {
      color: #666;
      margin-bottom: 8px;
    }
    .export-section {
      margin: 16px 0;
    }
    .export-section h4 {
      margin-bottom: 12px;
    }
    @media (max-width: 600px) {
      .form-row {
        flex-direction: column;
      }
      .form-row button {
        width: 100%;
      }
    }
  `]
})
export class ConfigureComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  userProfileService = inject(UserProfileService);
  private firestoreService = inject(FirestoreService);
  private snackBar = inject(MatSnackBar);
  private gridApi?: GridApi;
  private reportsSubscription?: Subscription;

  // Call sign
  newCallSign = '';

  // Location
  selectedLocationId: string | null = null;
  savedLocations = computed(() => this.userProfileService.savedLocations());
  editingLocation: SavedLocation | null = null;
  locationForm = {
    nickname: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null
  };
  isGettingLocation = signal(false);
  private locationGridApi?: GridApi;

  locationColumnDefs: ColDef[] = [
    { field: 'nickname', headerName: 'Nickname', sortable: true, filter: true },
    { field: 'address', headerName: 'Address', sortable: true, filter: true, flex: 2 },
    { field: 'latitude', headerName: 'Lat', sortable: true, filter: true, width: 100 },
    { field: 'longitude', headerName: 'Long', sortable: true, filter: true, width: 100 }
  ];

  // Repeater/Simplex
  useRepeater = false;
  simplexFrequency = '146.52';
  repeaterSearch = '';
  repeaterCallSign = '';
  repeaterFrequency = '';
  filteredRepeaters = signal<RepeaterInfo[]>([]);
  allRepeaters: RepeaterInfo[] = [];

  // Radio setups
  selectedRadioId: string | null = null;
  radioSetups = computed(() => this.userProfileService.radioSetups());
  editingRadio: RadioSetup | null = null;
  radioForm = {
    nickname: '',
    make: '',
    model: '',
    antenna: '',
    description: ''
  };

  radioColumnDefs: ColDef[] = [
    { field: 'nickname', headerName: 'Nickname', sortable: true, filter: true },
    { field: 'make', headerName: 'Make', sortable: true, filter: true },
    { field: 'model', headerName: 'Model', sortable: true, filter: true },
    { field: 'antenna', headerName: 'Antenna', sortable: true, filter: true },
    { field: 'description', headerName: 'Description', sortable: true, filter: true, flex: 2 }
  ];

  // Groups
  selectedGroupId: string | null = null;
  groups = computed(() => this.userProfileService.groups());
  editingGroup: SignalGroup | null = null;
  groupForm = { nickname: '' };
  private groupGridApi?: GridApi;

  groupColumnDefs: ColDef[] = [
    { field: 'groupNumber', headerName: '#', sortable: true, filter: true, width: 80 },
    { field: 'nickname', headerName: 'Nickname', sortable: true, filter: true, flex: 2 }
  ];

  // Data export
  exportGroupId: string | null = null;
  allSignalReports: SignalReport[] = [];

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true
  };

  ngOnInit(): void {
    this.loadCurrentValues();
    this.loadRepeaters();
    this.loadSignalReports();
  }

  ngOnDestroy(): void {
    this.reportsSubscription?.unsubscribe();
  }

  private loadCurrentValues(): void {
    const profile = this.userProfileService.profile();
    if (profile) {
      this.newCallSign = profile.callSign || '';
      this.selectedLocationId = profile.currentLocationId || null;
      this.useRepeater = profile.useRepeater || false;
      this.simplexFrequency = profile.simplexFrequency || '146.52';
      this.repeaterCallSign = profile.repeaterInfo?.callSign || '';
      this.repeaterFrequency = profile.repeaterInfo?.frequency || '';
      this.selectedRadioId = profile.currentRadioId || null;
      this.selectedGroupId = profile.currentGroupId || null;
    }
  }

  private async loadRepeaters(): Promise<void> {
    try {
      this.allRepeaters = await this.firestoreService.getRepeaters();
    } catch (error) {
      console.error('Error loading repeaters:', error);
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  // Call Sign
  canSaveCallSign(): boolean {
    const current = this.userProfileService.callSign();
    return !!(this.newCallSign.trim() && this.newCallSign.trim().toUpperCase() !== current);
  }

  async saveCallSign(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    try {
      await this.userProfileService.saveCallSign(user.uid, this.newCallSign.trim().toUpperCase());
      this.snackBar.open('Call sign saved', 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error saving call sign', 'Dismiss', { duration: 3000 });
    }
  }

  // Location
  onLocationGridReady(params: GridReadyEvent): void {
    this.locationGridApi = params.api;
  }

  onLocationRowClicked(event: any): void {
    this.editingLocation = event.data;
    this.locationForm = {
      nickname: event.data.nickname || '',
      address: event.data.address || '',
      latitude: event.data.latitude || null,
      longitude: event.data.longitude || null
    };
  }

  canSaveLocation(): boolean {
    return !!(this.locationForm.nickname.trim());
  }

  useCurrentGeoLocation(): void {
    if (!navigator.geolocation) {
      this.snackBar.open('Geolocation not supported', 'Dismiss', { duration: 3000 });
      return;
    }

    this.isGettingLocation.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locationForm.latitude = position.coords.latitude;
        this.locationForm.longitude = position.coords.longitude;
        this.isGettingLocation.set(false);
        this.snackBar.open('Coordinates updated', 'Dismiss', { duration: 2000 });
      },
      (error) => {
        this.isGettingLocation.set(false);
        this.snackBar.open('Error getting location: ' + error.message, 'Dismiss', { duration: 3000 });
      }
    );
  }

  async addLocationEntry(): Promise<void> {
    if (!this.canSaveLocation()) return;

    try {
      await this.userProfileService.addLocation({
        nickname: this.locationForm.nickname.trim(),
        address: this.locationForm.address?.trim(),
        latitude: this.locationForm.latitude || undefined,
        longitude: this.locationForm.longitude || undefined
      });
      this.clearLocationForm();
      this.snackBar.open('Location added', 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error adding location', 'Dismiss', { duration: 3000 });
    }
  }

  async updateLocationEntry(): Promise<void> {
    if (!this.editingLocation || !this.canSaveLocation()) return;

    try {
      await this.userProfileService.updateLocation({
        ...this.editingLocation,
        nickname: this.locationForm.nickname.trim(),
        address: this.locationForm.address?.trim(),
        latitude: this.locationForm.latitude || undefined,
        longitude: this.locationForm.longitude || undefined
      });
      this.clearLocationForm();
      this.snackBar.open('Location updated', 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error updating location', 'Dismiss', { duration: 3000 });
    }
  }

  async deleteLocationEntry(): Promise<void> {
    if (!this.editingLocation) return;

    try {
      await this.userProfileService.deleteLocation(this.editingLocation.id);
      this.clearLocationForm();
      this.snackBar.open('Location deleted', 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error deleting location', 'Dismiss', { duration: 3000 });
    }
  }

  cancelLocationEdit(): void {
    this.clearLocationForm();
  }

  private clearLocationForm(): void {
    this.editingLocation = null;
    this.locationForm = { nickname: '', address: '', latitude: null, longitude: null };
    this.locationGridApi?.deselectAll();
  }

  async setCurrentLocation(locationId: string | null): Promise<void> {
    try {
      await this.userProfileService.setCurrentLocation(locationId);
      this.snackBar.open('Active location updated', 'Dismiss', { duration: 2000 });
    } catch (error) {
      this.snackBar.open('Error setting active location', 'Dismiss', { duration: 3000 });
    }
  }

  // Repeater/Simplex
  async searchRepeaters(term: string): Promise<void> {
    if (!term || term.length < 2) {
      this.filteredRepeaters.set([]);
      return;
    }
    const termLower = term.toLowerCase();
    const filtered = this.allRepeaters.filter(r =>
      r.callSign.toLowerCase().includes(termLower) ||
      r.frequency.includes(term)
    );
    this.filteredRepeaters.set(filtered);
  }

  selectRepeater(repeater: RepeaterInfo): void {
    this.repeaterCallSign = repeater.callSign;
    this.repeaterFrequency = repeater.frequency;
    this.repeaterSearch = '';
  }

  async addRepeaterToList(): Promise<void> {
    if (!this.repeaterCallSign || !this.repeaterFrequency) return;

    try {
      await this.firestoreService.addRepeater({
        callSign: this.repeaterCallSign.toUpperCase(),
        frequency: this.repeaterFrequency
      });
      await this.loadRepeaters();
      this.snackBar.open('Repeater added to list', 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error adding repeater', 'Dismiss', { duration: 3000 });
    }
  }

  async saveFrequencyMode(): Promise<void> {
    try {
      if (this.useRepeater) {
        await this.userProfileService.setRepeaterMode(true, {
          callSign: this.repeaterCallSign.toUpperCase(),
          frequency: this.repeaterFrequency
        });
      } else {
        await this.userProfileService.setRepeaterMode(false, undefined, this.simplexFrequency);
      }
      this.snackBar.open('Frequency settings saved', 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error saving frequency settings', 'Dismiss', { duration: 3000 });
    }
  }

  // Radio Setups
  onRadioRowClicked(event: any): void {
    this.editingRadio = event.data;
    this.radioForm = {
      nickname: event.data.nickname || '',
      make: event.data.make,
      model: event.data.model,
      antenna: event.data.antenna,
      description: event.data.description || ''
    };
  }

  canSaveRadio(): boolean {
    return !!(this.radioForm.nickname.trim() && this.radioForm.make.trim() && this.radioForm.model.trim());
  }

  async addRadio(): Promise<void> {
    if (!this.canSaveRadio()) return;

    try {
      await this.userProfileService.addRadioSetup({
        nickname: this.radioForm.nickname.trim(),
        make: this.radioForm.make.trim(),
        model: this.radioForm.model.trim(),
        antenna: this.radioForm.antenna.trim(),
        description: this.radioForm.description.trim()
      });
      this.clearRadioForm();
      this.snackBar.open('Radio setup added', 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error adding radio setup', 'Dismiss', { duration: 3000 });
    }
  }

  async updateRadio(): Promise<void> {
    if (!this.editingRadio || !this.canSaveRadio()) return;

    try {
      await this.userProfileService.updateRadioSetup({
        ...this.editingRadio,
        nickname: this.radioForm.nickname.trim(),
        make: this.radioForm.make.trim(),
        model: this.radioForm.model.trim(),
        antenna: this.radioForm.antenna.trim(),
        description: this.radioForm.description.trim()
      });
      this.clearRadioForm();
      this.snackBar.open('Radio setup updated', 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error updating radio setup', 'Dismiss', { duration: 3000 });
    }
  }

  async deleteRadio(): Promise<void> {
    if (!this.editingRadio) return;

    try {
      await this.userProfileService.deleteRadioSetup(this.editingRadio.id);
      this.clearRadioForm();
      this.snackBar.open('Radio setup deleted', 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error deleting radio setup', 'Dismiss', { duration: 3000 });
    }
  }

  cancelEdit(): void {
    this.clearRadioForm();
  }

  private clearRadioForm(): void {
    this.editingRadio = null;
    this.radioForm = { nickname: '', make: '', model: '', antenna: '', description: '' };
    this.gridApi?.deselectAll();
  }

  async setCurrentRadio(radioId: string | null): Promise<void> {
    try {
      await this.userProfileService.setCurrentRadio(radioId);
      this.snackBar.open('Active radio updated', 'Dismiss', { duration: 2000 });
    } catch (error) {
      this.snackBar.open('Error setting active radio', 'Dismiss', { duration: 3000 });
    }
  }

  // Groups
  onGroupGridReady(params: GridReadyEvent): void {
    this.groupGridApi = params.api;
  }

  onGroupRowClicked(event: any): void {
    this.editingGroup = event.data;
    this.groupForm = { nickname: event.data.nickname || '' };
  }

  canSaveGroup(): boolean {
    return !!(this.groupForm.nickname.trim());
  }

  async addGroup(): Promise<void> {
    if (!this.canSaveGroup()) return;

    try {
      const newGroup = await this.userProfileService.addGroup(this.groupForm.nickname.trim());
      this.clearGroupForm();
      this.snackBar.open(`Group #${newGroup.groupNumber} created`, 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error creating group', 'Dismiss', { duration: 3000 });
    }
  }

  async updateGroup(): Promise<void> {
    if (!this.editingGroup || !this.canSaveGroup()) return;

    try {
      await this.userProfileService.updateGroupNickname(this.editingGroup.id, this.groupForm.nickname.trim());
      this.clearGroupForm();
      this.snackBar.open('Group nickname updated', 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error updating group', 'Dismiss', { duration: 3000 });
    }
  }

  async deleteGroup(): Promise<void> {
    if (!this.editingGroup) return;

    try {
      await this.userProfileService.deleteGroup(this.editingGroup.id);
      this.clearGroupForm();
      this.snackBar.open('Group deleted', 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error deleting group', 'Dismiss', { duration: 3000 });
    }
  }

  cancelGroupEdit(): void {
    this.clearGroupForm();
  }

  private clearGroupForm(): void {
    this.editingGroup = null;
    this.groupForm = { nickname: '' };
    this.groupGridApi?.deselectAll();
  }

  async setCurrentGroup(groupId: string | null): Promise<void> {
    try {
      await this.userProfileService.setCurrentGroup(groupId);
      this.snackBar.open('Active group updated', 'Dismiss', { duration: 2000 });
    } catch (error) {
      this.snackBar.open('Error setting active group', 'Dismiss', { duration: 3000 });
    }
  }

  // Data Export
  private loadSignalReports(): void {
    this.reportsSubscription = this.firestoreService.getSignalReports().subscribe({
      next: (reports) => {
        this.allSignalReports = reports;
      },
      error: (error) => {
        console.error('Error loading signal reports:', error);
      }
    });
  }

  exportAllData(format: 'csv' | 'json'): void {
    if (this.allSignalReports.length === 0) {
      this.snackBar.open('No data to export', 'Dismiss', { duration: 3000 });
      return;
    }

    const data = this.prepareExportData(this.allSignalReports);
    this.downloadFile(data, `signal-reports-all`, format);
  }

  exportGroupData(format: 'csv' | 'json'): void {
    if (!this.exportGroupId) return;

    const groupReports = this.allSignalReports.filter(r => r.groupId === this.exportGroupId);
    if (groupReports.length === 0) {
      this.snackBar.open('No reports in this group', 'Dismiss', { duration: 3000 });
      return;
    }

    const group = this.userProfileService.groups().find(g => g.id === this.exportGroupId);
    const filename = group ? `signal-reports-group-${group.groupNumber}` : 'signal-reports-group';

    const data = this.prepareExportData(groupReports);
    this.downloadFile(data, filename, format);
  }

  private prepareExportData(reports: SignalReport[]): any[] {
    return reports.map(r => ({
      transmitterCall: r.transmitterCall,
      signalHeard: r.signalHeard,
      time: this.formatDateForExport(r.time),
      receiverCall: r.receiverCall,
      groupNumber: r.groupNumber || '',
      frequency: r.useRepeater
        ? `${r.repeaterCallSign || ''} ${r.repeaterFrequency || ''}`.trim()
        : r.simplexFrequency || '',
      frequencyType: r.useRepeater ? 'Repeater' : 'Simplex',
      radioMake: r.radioMake || '',
      radioModel: r.radioModel || '',
      antenna: r.antenna || '',
      locationAddress: r.location?.address || '',
      locationLat: r.location?.latitude || '',
      locationLong: r.location?.longitude || ''
    }));
  }

  private formatDateForExport(value: any): string {
    if (!value) return '';
    let date: Date;
    if (value.toDate) {
      date = value.toDate();
    } else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(value);
    }
    return date.toISOString();
  }

  private downloadFile(data: any[], filename: string, format: 'csv' | 'json'): void {
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      content = this.convertToCSV(data);
      mimeType = 'text/csv';
      extension = 'csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.snackBar.open(`Downloaded ${filename}.${extension}`, 'Dismiss', { duration: 3000 });
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if needed
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];
    return csvRows.join('\n');
  }
}
