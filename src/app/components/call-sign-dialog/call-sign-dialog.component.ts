import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-call-sign-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Welcome!</h2>
    <mat-dialog-content>
      <p>Please enter your call sign to continue.</p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Call Sign</mat-label>
        <input matInput [(ngModel)]="callSign" placeholder="e.g., W1ABC" required
               (keyup.enter)="submit()" autofocus>
        <mat-hint>Your amateur radio call sign</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [disabled]="!callSign.trim()" (click)="submit()">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }
    mat-dialog-content {
      min-width: 300px;
    }
    p {
      margin-bottom: 16px;
    }
  `]
})
export class CallSignDialogComponent {
  callSign = '';

  constructor(private dialogRef: MatDialogRef<CallSignDialogComponent>) {}

  submit(): void {
    if (this.callSign.trim()) {
      this.dialogRef.close(this.callSign.trim().toUpperCase());
    }
  }
}
