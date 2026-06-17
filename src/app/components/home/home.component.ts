import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GridApi, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { Subscription } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

ModuleRegistry.registerModules([AllCommunityModule]);

import { AuthService } from '../../services/auth.service';
import { FirestoreService } from '../../services/firestore.service';
import { UserProfileService } from '../../services/user-profile.service';
import { SignalReport } from '../../models/signal-report.model';
import { SignalMapComponent } from '../signal-map/signal-map.component';

@Component({
  selector: 'app-home',
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
    AgGridAngular,
    SignalMapComponent
  ],
  template: `
    <div class="home-container">
      <mat-card class="form-card">
        <mat-card-header>
          <mat-card-title>Log Signal Report</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form (ngSubmit)="submitReport()" class="report-form">
            <mat-form-field appearance="outline">
              <mat-label>Transmitter's Call</mat-label>
              <input matInput [(ngModel)]="transmitterCall" name="transmitterCall"
                     placeholder="e.g., W1ABC" required>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Signal Heard</mat-label>
              <input matInput [(ngModel)]="signalHeard" name="signalHeard"
                     placeholder="e.g., 599" required>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit"
                    [disabled]="!canSubmit() || isSubmitting()">
              <mat-icon>send</mat-icon>
              Submit Report
            </button>

            <mat-form-field appearance="outline">
              <mat-label>Time (UTC)</mat-label>
              <input matInput type="datetime-local" [(ngModel)]="time" name="time" required>
            </mat-form-field>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="swap-button-container">
        <button mat-stroked-button (click)="toggleMapPosition()">
          <mat-icon>swap_vert</mat-icon>
          {{ mapFirst() ? 'Show Table First' : 'Show Map First' }}
        </button>
      </div>

      @if (mapFirst()) {
        <ng-container *ngTemplateOutlet="mapCard"></ng-container>
        <ng-container *ngTemplateOutlet="tableCard"></ng-container>
      } @else {
        <ng-container *ngTemplateOutlet="tableCard"></ng-container>
        <ng-container *ngTemplateOutlet="mapCard"></ng-container>
      }

      <ng-template #mapCard>
        <mat-card class="map-card">
          <mat-card-header>
            <mat-card-title>Signal Map</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-signal-map [reports]="rowData"></app-signal-map>
          </mat-card-content>
        </mat-card>
      </ng-template>

      <ng-template #tableCard>
        <mat-card class="grid-card">
          <mat-card-header>
            <mat-card-title>Signal Reports</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <ag-grid-angular
              class="ag-theme-quartz"
              [rowData]="rowData"
              [columnDefs]="columnDefs"
              [defaultColDef]="defaultColDef"
              [pagination]="true"
              [paginationPageSize]="20"
              (gridReady)="onGridReady($event)">
            </ag-grid-angular>
          </mat-card-content>
        </mat-card>
      </ng-template>
    </div>
  `,
  styles: [`
    .home-container {
      padding: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .form-card {
      margin-bottom: 16px;
    }
    .swap-button-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
    }
    .report-form {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: flex-start;
    }
    .report-form mat-form-field {
      flex: 1;
      min-width: 200px;
    }
    .report-form button {
      margin-top: 8px;
    }
    .map-card {
      margin-bottom: 16px;
    }
    .map-card mat-card-content {
      height: 450px;
    }
    .grid-card {
      height: 500px;
    }
    .grid-card mat-card-content {
      height: calc(100% - 50px);
    }
    ag-grid-angular {
      width: 100%;
      height: 100%;
    }
    @media (max-width: 600px) {
      .report-form {
        flex-direction: column;
      }
      .report-form mat-form-field {
        width: 100%;
      }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private firestoreService = inject(FirestoreService);
  private userProfileService = inject(UserProfileService);
  private snackBar = inject(MatSnackBar);
  private subscription?: Subscription;
  private gridApi?: GridApi;

  transmitterCall = '';
  signalHeard = '';
  time = '';

  rowData: SignalReport[] = [];
  isSubmitting = signal(false);
  mapFirst = signal(true);

  columnDefs: ColDef[] = [
    { field: 'transmitterCall', headerName: "Transmitter's Call", sortable: true, filter: true },
    { field: 'signalHeard', headerName: 'Signal Heard', sortable: true, filter: true },
    {
      field: 'time',
      headerName: 'Time (UTC)',
      sortable: true,
      filter: true,
      valueFormatter: (params) => this.formatTimestamp(params.value)
    },
    { field: 'receiverCall', headerName: "Receiver's Call", sortable: true, filter: true },
    {
      headerName: 'Frequency',
      sortable: true,
      filter: true,
      valueGetter: (params) => {
        if (params.data?.useRepeater) {
          return `${params.data.repeaterCallSign || ''} ${params.data.repeaterFrequency || ''}`.trim();
        }
        return params.data?.simplexFrequency || '';
      }
    },
    {
      headerName: 'Radio',
      sortable: true,
      filter: true,
      valueGetter: (params) => {
        if (params.data?.radioMake || params.data?.radioModel) {
          return `${params.data.radioMake || ''} ${params.data.radioModel || ''}`.trim();
        }
        return '';
      }
    }
  ];

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true
  };

  ngOnInit(): void {
    this.setCurrentTime();
    this.loadSignalReports();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private setCurrentTime(): void {
    const now = new Date();
    this.time = now.toISOString().slice(0, 16);
  }

  private loadSignalReports(): void {
    this.subscription = this.firestoreService.getSignalReports().subscribe({
      next: (reports) => {
        this.rowData = [...reports];
      },
      error: (error) => {
        console.error('Error loading reports:', error);
        this.snackBar.open('Error loading reports', 'Dismiss', { duration: 3000 });
      }
    });
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  toggleMapPosition(): void {
    this.mapFirst.update(v => !v);
  }

  canSubmit(): boolean {
    return !!(
      this.transmitterCall.trim() &&
      this.signalHeard.trim() &&
      this.time &&
      this.userProfileService.callSign()
    );
  }

  async submitReport(): Promise<void> {
    if (!this.canSubmit()) return;

    const user = this.authService.currentUser();
    const callSign = this.userProfileService.callSign();

    if (!user || !callSign) {
      this.snackBar.open('Please sign in and set your call sign', 'Dismiss', { duration: 3000 });
      return;
    }

    this.isSubmitting.set(true);

    try {
      // Get current radio setup
      const currentRadio = this.userProfileService.currentRadio();
      const location = this.userProfileService.location();
      const useRepeater = this.userProfileService.useRepeater();
      const repeaterInfo = this.userProfileService.repeaterInfo();
      const simplexFrequency = this.userProfileService.simplexFrequency();

      // Build report object, filtering out undefined values (Firestore doesn't accept undefined)
      const report: any = {
        transmitterCall: this.transmitterCall.trim().toUpperCase(),
        signalHeard: this.signalHeard.trim(),
        time: Timestamp.fromDate(new Date(this.time)),
        receiverCall: callSign,
        receiverUid: user.uid,
        useRepeater
      };

      // Add optional fields only if they have values
      if (currentRadio?.make) report.radioMake = currentRadio.make;
      if (currentRadio?.model) report.radioModel = currentRadio.model;
      if (currentRadio?.antenna) report.antenna = currentRadio.antenna;
      if (currentRadio?.description) report.radioDescription = currentRadio.description;
      if (location && (location.address || location.latitude || location.longitude)) {
        report.location = location;
      }
      if (useRepeater && repeaterInfo?.callSign) report.repeaterCallSign = repeaterInfo.callSign;
      if (useRepeater && repeaterInfo?.frequency) report.repeaterFrequency = repeaterInfo.frequency;
      if (!useRepeater && simplexFrequency) report.simplexFrequency = simplexFrequency;

      await this.firestoreService.addSignalReport(report);

      this.snackBar.open('Report submitted successfully', 'Dismiss', { duration: 3000 });
      this.transmitterCall = '';
      this.signalHeard = '';
      this.setCurrentTime();
    } catch (error) {
      console.error('Error submitting report:', error);
      this.snackBar.open('Error submitting report', 'Dismiss', { duration: 3000 });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private formatTimestamp(value: Timestamp | Date | string): string {
    if (!value) return '';

    let date: Date;
    if (value instanceof Timestamp) {
      date = value.toDate();
    } else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(value);
    }

    return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  }
}
