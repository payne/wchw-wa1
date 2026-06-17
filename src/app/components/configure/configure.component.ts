import { Component, inject, signal, OnInit, computed } from '@angular/core';
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

import { AuthService } from '../../services/auth.service';
import { UserProfileService } from '../../services/user-profile.service';
import { FirestoreService } from '../../services/firestore.service';
import { RadioSetup, RepeaterInfo, Location } from '../../models/signal-report.model';

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
          <mat-card-title>Location</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-2">
              <mat-label>Address</mat-label>
              <input matInput [(ngModel)]="locationAddress"
                     placeholder="123 Main St, City, State ZIP">
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Latitude</mat-label>
              <input matInput type="number" [(ngModel)]="locationLat" step="0.000001">
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Longitude</mat-label>
              <input matInput type="number" [(ngModel)]="locationLng" step="0.000001">
            </mat-form-field>
            <button mat-raised-button (click)="useCurrentLocation()"
                    [disabled]="isGettingLocation()">
              <mat-icon>my_location</mat-icon>
              {{ isGettingLocation() ? 'Getting...' : 'Use Current' }}
            </button>
          </div>

          <div class="form-actions">
            <button mat-raised-button color="primary" (click)="saveLocation()">
              <mat-icon>save</mat-icon> Save Location
            </button>
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
                      {{ radio.make }} {{ radio.model }} - {{ radio.antenna }}
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
export class ConfigureComponent implements OnInit {
  authService = inject(AuthService);
  userProfileService = inject(UserProfileService);
  private firestoreService = inject(FirestoreService);
  private snackBar = inject(MatSnackBar);
  private gridApi?: GridApi;

  // Call sign
  newCallSign = '';

  // Location
  locationAddress = '';
  locationLat: number | null = null;
  locationLng: number | null = null;
  isGettingLocation = signal(false);

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
    make: '',
    model: '',
    antenna: '',
    description: ''
  };

  radioColumnDefs: ColDef[] = [
    { field: 'make', headerName: 'Make', sortable: true, filter: true },
    { field: 'model', headerName: 'Model', sortable: true, filter: true },
    { field: 'antenna', headerName: 'Antenna', sortable: true, filter: true },
    { field: 'description', headerName: 'Description', sortable: true, filter: true, flex: 2 }
  ];

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true
  };

  ngOnInit(): void {
    this.loadCurrentValues();
    this.loadRepeaters();
  }

  private loadCurrentValues(): void {
    const profile = this.userProfileService.profile();
    if (profile) {
      this.newCallSign = profile.callSign || '';
      this.locationAddress = profile.location?.address || '';
      this.locationLat = profile.location?.latitude || null;
      this.locationLng = profile.location?.longitude || null;
      this.useRepeater = profile.useRepeater || false;
      this.simplexFrequency = profile.simplexFrequency || '146.52';
      this.repeaterCallSign = profile.repeaterInfo?.callSign || '';
      this.repeaterFrequency = profile.repeaterInfo?.frequency || '';
      this.selectedRadioId = profile.currentRadioId || null;
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
  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.snackBar.open('Geolocation not supported', 'Dismiss', { duration: 3000 });
      return;
    }

    this.isGettingLocation.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locationLat = position.coords.latitude;
        this.locationLng = position.coords.longitude;
        this.isGettingLocation.set(false);
        this.snackBar.open('Location updated', 'Dismiss', { duration: 2000 });
      },
      (error) => {
        this.isGettingLocation.set(false);
        this.snackBar.open('Error getting location: ' + error.message, 'Dismiss', { duration: 3000 });
      }
    );
  }

  async saveLocation(): Promise<void> {
    const location: Location = {};
    if (this.locationAddress) location.address = this.locationAddress;
    if (this.locationLat !== null) location.latitude = this.locationLat;
    if (this.locationLng !== null) location.longitude = this.locationLng;

    try {
      await this.userProfileService.setLocation(location);
      this.snackBar.open('Location saved', 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error saving location', 'Dismiss', { duration: 3000 });
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
      make: event.data.make,
      model: event.data.model,
      antenna: event.data.antenna,
      description: event.data.description || ''
    };
  }

  canSaveRadio(): boolean {
    return !!(this.radioForm.make.trim() && this.radioForm.model.trim());
  }

  async addRadio(): Promise<void> {
    if (!this.canSaveRadio()) return;

    try {
      await this.userProfileService.addRadioSetup({
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
    this.radioForm = { make: '', model: '', antenna: '', description: '' };
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
}
