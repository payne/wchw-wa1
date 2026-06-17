import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GridApi, ModuleRegistry, AllCommunityModule, ICellRendererParams } from 'ag-grid-community';
import { Subscription } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

ModuleRegistry.registerModules([AllCommunityModule]);

import { AuthService } from '../../services/auth.service';
import { FirestoreService } from '../../services/firestore.service';
import { UserProfileService } from '../../services/user-profile.service';
import { CallsignLookupService } from '../../services/callsign-lookup.service';
import { SignalReport, Location } from '../../models/signal-report.model';
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
    MatTooltipModule,
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
            <div class="expand-controls">
              <button mat-icon-button (click)="expandAllRows()" matTooltip="Expand all rows">
                <mat-icon>unfold_more</mat-icon>
              </button>
              <button mat-icon-button (click)="collapseAllRows()" matTooltip="Collapse all rows">
                <mat-icon>unfold_less</mat-icon>
              </button>
            </div>
          </mat-card-header>
          <mat-card-content>
            <ag-grid-angular
              class="ag-theme-quartz"
              [rowData]="rowData"
              [columnDefs]="columnDefs"
              [defaultColDef]="defaultColDef"
              [getRowHeight]="getRowHeight"
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
    .grid-card mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .expand-controls {
      display: flex;
      gap: 4px;
    }
    .grid-card mat-card-content {
      height: calc(100% - 50px);
    }
    ag-grid-angular {
      width: 100%;
      height: 100%;
    }
    :host ::ng-deep .expand-cell {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      cursor: pointer;
      padding-top: 10px;
    }
    :host ::ng-deep .expand-icon {
      font-size: 18px;
      color: #666;
      transition: transform 0.2s;
    }
    :host ::ng-deep .expand-icon.expanded {
      transform: rotate(90deg);
    }
    :host ::ng-deep .cell-with-details {
      display: flex;
      flex-direction: column;
      padding: 4px 0;
    }
    :host ::ng-deep .cell-with-details .main-value {
      font-weight: 500;
      margin-bottom: 8px;
    }
    :host ::ng-deep .cell-with-details .inline-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
      color: #555;
      background: #f8f9fa;
      padding: 8px;
      border-radius: 4px;
      border-left: 3px solid #2196F3;
    }
    :host ::ng-deep .cell-with-details .inline-details strong {
      color: #333;
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
  private callsignLookup = inject(CallsignLookupService);
  private snackBar = inject(MatSnackBar);
  private subscription?: Subscription;
  private gridApi?: GridApi;

  transmitterCall = '';
  signalHeard = '';
  time = '';

  rowData: SignalReport[] = [];
  isSubmitting = signal(false);
  mapFirst = signal(true);

  // Track expanded rows and distances
  private expandedRows = new Set<string>();
  private distanceCache = new Map<string, number | null>();

  columnDefs: ColDef[] = [
    {
      headerName: '',
      field: 'expand',
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams) => this.expandCellRenderer(params)
    },
    {
      field: 'transmitterCall',
      headerName: "Transmitter's Call",
      sortable: true,
      filter: true,
      cellRenderer: (params: ICellRendererParams) => this.mainCellRenderer(params, 'transmitterCall')
    },
    {
      field: 'signalHeard',
      headerName: 'Signal Heard',
      sortable: true,
      filter: true
    },
    {
      field: 'time',
      headerName: 'Time (UTC)',
      sortable: true,
      filter: true,
      valueFormatter: (params) => this.formatTimestamp(params.value)
    },
    {
      field: 'receiverCall',
      headerName: "Receiver's Call",
      sortable: true,
      filter: true
    },
    {
      colId: 'distance',
      headerName: 'Distance',
      sortable: true,
      filter: true,
      valueGetter: (params) => this.getDistance(params.data?.id),
      valueFormatter: (params) => {
        if (params.value === null || params.value === undefined) return '—';
        return `${params.value.toFixed(1)} mi`;
      }
    }
  ];

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true
  };

  getRowHeight = (params: any): number => {
    if (params.data?.id && this.expandedRows.has(params.data.id)) {
      return 100;
    }
    return 42;
  };

  private expandListener = (event: Event) => {
    const customEvent = event as CustomEvent<string>;
    this.toggleRowExpand(customEvent.detail);
  };

  ngOnInit(): void {
    this.setCurrentTime();
    this.loadSignalReports();
    window.addEventListener('toggleRowExpand', this.expandListener);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    window.removeEventListener('toggleRowExpand', this.expandListener);
  }

  private setCurrentTime(): void {
    const now = new Date();
    this.time = now.toISOString().slice(0, 16);
  }

  private loadSignalReports(): void {
    this.subscription = this.firestoreService.getSignalReports().subscribe({
      next: (reports) => {
        this.rowData = [...reports];
        this.calculateDistances();
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

  // Expand/collapse functionality
  toggleRowExpand(reportId: string): void {
    if (this.expandedRows.has(reportId)) {
      this.expandedRows.delete(reportId);
    } else {
      this.expandedRows.add(reportId);
    }
    this.gridApi?.resetRowHeights();
    this.gridApi?.refreshCells({ force: true });
  }

  expandAllRows(): void {
    this.rowData.forEach(report => {
      if (report.id) {
        this.expandedRows.add(report.id);
      }
    });
    this.gridApi?.resetRowHeights();
    this.gridApi?.refreshCells({ force: true });
  }

  collapseAllRows(): void {
    this.expandedRows.clear();
    this.gridApi?.resetRowHeights();
    this.gridApi?.refreshCells({ force: true });
  }

  private expandCellRenderer(params: ICellRendererParams): string {
    const reportId = params.data?.id;
    if (!reportId) return '';
    const isExpanded = this.expandedRows.has(reportId);
    const icon = isExpanded ? 'expand_more' : 'chevron_right';
    return `<div class="expand-cell" onclick="window.dispatchEvent(new CustomEvent('toggleRowExpand', {detail: '${reportId}'}))">
      <span class="material-icons expand-icon ${isExpanded ? 'expanded' : ''}">${icon}</span>
    </div>`;
  }

  private mainCellRenderer(params: ICellRendererParams, field: string): string {
    const reportId = params.data?.id;
    const value = params.data?.[field] || '';
    const isExpanded = reportId && this.expandedRows.has(reportId);

    if (!isExpanded) {
      return `<span>${value}</span>`;
    }

    const data = params.data;
    const frequencyInfo = data.useRepeater
      ? `Repeater: ${data.repeaterCallSign || ''} ${data.repeaterFrequency || ''}`.trim()
      : `Simplex: ${data.simplexFrequency || 'N/A'}`;

    const radioInfo = (data.radioMake || data.radioModel)
      ? `${data.radioMake || ''} ${data.radioModel || ''}`.trim()
      : 'N/A';

    const antennaInfo = data.antenna || 'N/A';
    const locationInfo = data.location?.address || 'N/A';

    return `
      <div class="cell-with-details">
        <span class="main-value">${value}</span>
        <div class="inline-details">
          <span><strong>Freq:</strong> ${frequencyInfo}</span>
          <span><strong>Radio:</strong> ${radioInfo}</span>
          <span><strong>Antenna:</strong> ${antennaInfo}</span>
          <span><strong>Location:</strong> ${locationInfo}</span>
        </div>
      </div>
    `;
  }

  // Distance calculation
  private async calculateDistances(): Promise<void> {
    for (const report of this.rowData) {
      if (!report.id) continue;

      // Look up both transmitter and receiver locations from HamDB (their QTH)
      const [transmitterInfo, receiverInfo] = await Promise.all([
        this.callsignLookup.lookupCallsign(report.transmitterCall),
        this.callsignLookup.lookupCallsign(report.receiverCall)
      ]);

      const transmitterLoc = transmitterInfo?.location;
      const receiverLoc = receiverInfo?.location;

      if (!transmitterLoc?.latitude || !transmitterLoc?.longitude ||
          !receiverLoc?.latitude || !receiverLoc?.longitude) {
        this.distanceCache.set(report.id, null);
        continue;
      }

      const distance = this.haversineDistance(
        receiverLoc.latitude,
        receiverLoc.longitude,
        transmitterLoc.latitude,
        transmitterLoc.longitude
      );
      this.distanceCache.set(report.id, distance);
    }

    this.gridApi?.refreshCells({ columns: ['distance'], force: true });
  }

  private getDistance(reportId: string | undefined): number | null {
    if (!reportId) return null;
    return this.distanceCache.get(reportId) ?? null;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3958.8; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
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

      // Get current group info
      const currentGroup = this.userProfileService.currentGroup();

      // Build report object, filtering out undefined values (Firestore doesn't accept undefined)
      const report: any = {
        transmitterCall: this.transmitterCall.trim().toUpperCase(),
        signalHeard: this.signalHeard.trim(),
        time: Timestamp.fromDate(new Date(this.time)),
        receiverCall: callSign,
        receiverUid: user.uid,
        useRepeater
      };

      // Add group info if a group is selected
      if (currentGroup) {
        report.groupId = currentGroup.id;
        report.groupNumber = currentGroup.groupNumber;
      }

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
