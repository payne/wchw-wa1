import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, AfterViewInit, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { SignalReport, Location } from '../../models/signal-report.model';
import { CallsignLookupService, CallsignInfo } from '../../services/callsign-lookup.service';

// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface StationInfo {
  callSign: string;
  location: Location;
  name?: string;
  reportsReceived: number;
  reportsTransmitted: number;
  isLookedUp: boolean; // true if location came from API lookup
}

interface SignalPath {
  fromCall: string;
  toCall: string;
  fromLocation: Location;
  toLocation: Location;
  signalStrength: string;
  count: number;
  useRepeater: boolean;
  repeaterInfo?: string;
}

@Component({
  selector: 'app-signal-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container">
      <div #mapElement class="map"></div>
      @if (isLoading()) {
        <div class="loading-overlay">
          <span>Looking up callsigns...</span>
        </div>
      }
      <div class="map-legend">
        <h4>Legend</h4>
        <div class="legend-item">
          <span class="legend-marker station"></span> Station (reported)
        </div>
        <div class="legend-item">
          <span class="legend-marker station-lookup"></span> Station (FCC lookup)
        </div>
        <div class="legend-item">
          <span class="legend-line simplex"></span> Simplex
        </div>
        <div class="legend-item">
          <span class="legend-line repeater"></span> Repeater
        </div>
        <div class="legend-stats">
          {{ stationCount() }} stations, {{ pathCount() }} paths
        </div>
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 400px;
    }
    .map {
      width: 100%;
      height: 100%;
      min-height: 400px;
      border-radius: 4px;
    }
    .loading-overlay {
      position: absolute;
      top: 10px;
      right: 50px;
      background: rgba(33, 150, 243, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      z-index: 1000;
      font-size: 12px;
    }
    .map-legend {
      position: absolute;
      bottom: 20px;
      left: 10px;
      background: white;
      padding: 10px;
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      z-index: 1000;
      font-size: 12px;
    }
    .map-legend h4 {
      margin: 0 0 8px 0;
      font-size: 13px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0;
    }
    .legend-marker {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .legend-marker.station {
      background: #2196F3;
      border: 2px solid #1565C0;
    }
    .legend-marker.station-lookup {
      background: #9C27B0;
      border: 2px solid #7B1FA2;
    }
    .legend-line {
      width: 24px;
      height: 3px;
    }
    .legend-line.simplex {
      background: #4CAF50;
    }
    .legend-line.repeater {
      background: #FF9800;
    }
    .legend-stats {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 11px;
    }
  `]
})
export class SignalMapComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapElement') mapElement!: ElementRef;
  @Input() reports: SignalReport[] = [];

  private callsignLookup = inject(CallsignLookupService);

  private map!: L.Map;
  private reportedStationsLayer!: L.LayerGroup;
  private lookedUpStationsLayer!: L.LayerGroup;
  private simplexPathsLayer!: L.LayerGroup;
  private repeaterPathsLayer!: L.LayerGroup;
  private layerControl!: L.Control.Layers;
  private initialized = false;

  isLoading = signal(false);
  stationCount = signal(0);
  pathCount = signal(0);

  // Cache for looked up locations
  private lookupCache = new Map<string, Location | null>();

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reports'] && this.initialized) {
      this.updateMapData();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    // Initialize map centered on US
    this.map = L.map(this.mapElement.nativeElement, {
      center: [39.8283, -98.5795],
      zoom: 4
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // Create layer groups
    this.reportedStationsLayer = L.layerGroup().addTo(this.map);
    this.lookedUpStationsLayer = L.layerGroup().addTo(this.map);
    this.simplexPathsLayer = L.layerGroup().addTo(this.map);
    this.repeaterPathsLayer = L.layerGroup().addTo(this.map);

    // Add layer control
    const overlays = {
      'Stations (Reported)': this.reportedStationsLayer,
      'Stations (FCC Lookup)': this.lookedUpStationsLayer,
      'Simplex Paths': this.simplexPathsLayer,
      'Repeater Paths': this.repeaterPathsLayer
    };
    this.layerControl = L.control.layers(undefined, overlays, { collapsed: false }).addTo(this.map);

    this.initialized = true;
    this.updateMapData();
  }

  private async updateMapData(): Promise<void> {
    if (!this.initialized || !this.reports) return;

    // Clear existing layers
    this.reportedStationsLayer.clearLayers();
    this.lookedUpStationsLayer.clearLayers();
    this.simplexPathsLayer.clearLayers();
    this.repeaterPathsLayer.clearLayers();

    // Extract stations from reports (those with location data)
    const reportedStations = this.extractReportedStations();

    // Find callsigns that need lookup
    const callsignsNeedingLookup = this.findCallsignsNeedingLookup(reportedStations);

    // Look up missing callsigns
    if (callsignsNeedingLookup.length > 0) {
      this.isLoading.set(true);
      await this.lookupCallsigns(callsignsNeedingLookup);
      this.isLoading.set(false);
    }

    // Merge reported stations with looked up stations
    const allStations = this.mergeStations(reportedStations);

    // Extract paths using all available location data
    const paths = this.extractPaths(allStations);

    // Add markers and paths to map
    this.addStationMarkers(allStations);
    this.addSignalPaths(paths);

    // Update stats
    this.stationCount.set(allStations.size);
    this.pathCount.set(paths.length);

    // Fit map to bounds if we have data
    if (allStations.size > 0) {
      this.fitMapToBounds(allStations);
    }
  }

  private extractReportedStations(): Map<string, StationInfo> {
    const stations = new Map<string, StationInfo>();

    for (const report of this.reports) {
      // Add receiver station if they have location
      if (report.location?.latitude && report.location?.longitude) {
        const existing = stations.get(report.receiverCall);
        if (existing) {
          existing.reportsReceived++;
        } else {
          stations.set(report.receiverCall, {
            callSign: report.receiverCall,
            location: report.location,
            reportsReceived: 1,
            reportsTransmitted: 0,
            isLookedUp: false
          });
        }
      }
    }

    return stations;
  }

  private findCallsignsNeedingLookup(reportedStations: Map<string, StationInfo>): string[] {
    const needLookup = new Set<string>();

    for (const report of this.reports) {
      // Check transmitter
      if (!reportedStations.has(report.transmitterCall) && !this.lookupCache.has(report.transmitterCall)) {
        needLookup.add(report.transmitterCall);
      }
      // Check receiver (if they didn't report location)
      if (!reportedStations.has(report.receiverCall) && !this.lookupCache.has(report.receiverCall)) {
        needLookup.add(report.receiverCall);
      }
    }

    return Array.from(needLookup);
  }

  private async lookupCallsigns(callsigns: string[]): Promise<void> {
    const results = await this.callsignLookup.lookupMultiple(callsigns);

    results.forEach((info, callSign) => {
      if (info && info.location) {
        this.lookupCache.set(callSign, info.location);
      } else {
        this.lookupCache.set(callSign, null);
      }
    });
  }

  private mergeStations(reportedStations: Map<string, StationInfo>): Map<string, StationInfo> {
    const allStations = new Map(reportedStations);

    // Count transmissions for each station
    for (const report of this.reports) {
      const station = allStations.get(report.transmitterCall);
      if (station) {
        station.reportsTransmitted++;
      }
    }

    // Add looked up stations that aren't in reported stations
    for (const report of this.reports) {
      // Add transmitter if we have lookup data
      if (!allStations.has(report.transmitterCall)) {
        const lookedUpLocation = this.lookupCache.get(report.transmitterCall);
        if (lookedUpLocation) {
          const existing = allStations.get(report.transmitterCall);
          if (existing) {
            existing.reportsTransmitted++;
          } else {
            allStations.set(report.transmitterCall, {
              callSign: report.transmitterCall,
              location: lookedUpLocation,
              reportsReceived: 0,
              reportsTransmitted: 1,
              isLookedUp: true
            });
          }
        }
      }

      // Add receiver if we have lookup data (and they didn't report location)
      if (!allStations.has(report.receiverCall)) {
        const lookedUpLocation = this.lookupCache.get(report.receiverCall);
        if (lookedUpLocation) {
          allStations.set(report.receiverCall, {
            callSign: report.receiverCall,
            location: lookedUpLocation,
            reportsReceived: 1,
            reportsTransmitted: 0,
            isLookedUp: true
          });
        }
      }
    }

    return allStations;
  }

  private extractPaths(stations: Map<string, StationInfo>): SignalPath[] {
    const pathMap = new Map<string, SignalPath>();

    for (const report of this.reports) {
      const fromStation = stations.get(report.transmitterCall);
      const toStation = stations.get(report.receiverCall);

      if (!fromStation?.location?.latitude || !fromStation?.location?.longitude) continue;
      if (!toStation?.location?.latitude || !toStation?.location?.longitude) continue;

      // Create path key (sorted to make it bidirectional)
      const calls = [report.transmitterCall, report.receiverCall].sort();
      const key = `${calls[0]}-${calls[1]}`;

      const existing = pathMap.get(key);
      if (existing) {
        existing.count++;
        existing.signalStrength = report.signalHeard;
      } else {
        pathMap.set(key, {
          fromCall: report.transmitterCall,
          toCall: report.receiverCall,
          fromLocation: fromStation.location,
          toLocation: toStation.location,
          signalStrength: report.signalHeard,
          count: 1,
          useRepeater: report.useRepeater,
          repeaterInfo: report.useRepeater ?
            `${report.repeaterCallSign || ''} ${report.repeaterFrequency || ''}`.trim() :
            undefined
        });
      }
    }

    return Array.from(pathMap.values());
  }

  private addStationMarkers(stations: Map<string, StationInfo>): void {
    const reportedIcon = L.divIcon({
      className: 'station-marker',
      html: `<div style="
        background: #2196F3;
        border: 2px solid #1565C0;
        border-radius: 50%;
        width: 12px;
        height: 12px;
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    const lookedUpIcon = L.divIcon({
      className: 'station-marker-lookup',
      html: `<div style="
        background: #9C27B0;
        border: 2px solid #7B1FA2;
        border-radius: 50%;
        width: 12px;
        height: 12px;
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    stations.forEach((station, callSign) => {
      if (station.location.latitude && station.location.longitude) {
        const icon = station.isLookedUp ? lookedUpIcon : reportedIcon;
        const marker = L.marker(
          [station.location.latitude, station.location.longitude],
          { icon }
        );

        // Create popup content
        const sourceText = station.isLookedUp ? '(FCC lookup)' : '(reported)';
        const popupContent = `
          <strong>${callSign}</strong> ${sourceText}<br>
          ${station.location.address || ''}<br>
          Received: ${station.reportsReceived} | Transmitted: ${station.reportsTransmitted}
        `;
        marker.bindPopup(popupContent);
        marker.bindTooltip(callSign, { permanent: false, direction: 'top' });

        if (station.isLookedUp) {
          this.lookedUpStationsLayer.addLayer(marker);
        } else {
          this.reportedStationsLayer.addLayer(marker);
        }
      }
    });
  }

  private addSignalPaths(paths: SignalPath[]): void {
    for (const path of paths) {
      if (!path.fromLocation.latitude || !path.fromLocation.longitude ||
          !path.toLocation.latitude || !path.toLocation.longitude) {
        continue;
      }

      const latlngs: L.LatLngExpression[] = [
        [path.fromLocation.latitude, path.fromLocation.longitude],
        [path.toLocation.latitude, path.toLocation.longitude]
      ];

      const color = path.useRepeater ? '#FF9800' : '#4CAF50';
      const weight = Math.min(2 + path.count, 6);

      const polyline = L.polyline(latlngs, {
        color: color,
        weight: weight,
        opacity: 0.7
      });

      const popupContent = `
        <strong>${path.fromCall} ↔ ${path.toCall}</strong><br>
        Signal: ${path.signalStrength}<br>
        Reports: ${path.count}<br>
        ${path.useRepeater ? `Repeater: ${path.repeaterInfo}` : 'Simplex'}
      `;
      polyline.bindPopup(popupContent);

      if (path.useRepeater) {
        this.repeaterPathsLayer.addLayer(polyline);
      } else {
        this.simplexPathsLayer.addLayer(polyline);
      }
    }
  }

  private fitMapToBounds(stations: Map<string, StationInfo>): void {
    const bounds: L.LatLngBoundsExpression = [];

    stations.forEach(station => {
      if (station.location.latitude && station.location.longitude) {
        bounds.push([station.location.latitude, station.location.longitude]);
      }
    });

    if (bounds.length > 0) {
      this.map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    }
  }

  public invalidateSize(): void {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 100);
    }
  }
}
