import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { SignalReport, Location } from '../../models/signal-report.model';

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
  reportsReceived: number;
  reportsTransmitted: number;
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
      <div class="map-legend">
        <h4>Legend</h4>
        <div class="legend-item">
          <span class="legend-marker station"></span> Station
        </div>
        <div class="legend-item">
          <span class="legend-line simplex"></span> Simplex
        </div>
        <div class="legend-item">
          <span class="legend-line repeater"></span> Repeater
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
  `]
})
export class SignalMapComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapElement') mapElement!: ElementRef;
  @Input() reports: SignalReport[] = [];

  private map!: L.Map;
  private stationsLayer!: L.LayerGroup;
  private simplexPathsLayer!: L.LayerGroup;
  private repeaterPathsLayer!: L.LayerGroup;
  private layerControl!: L.Control.Layers;
  private initialized = false;

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
    this.stationsLayer = L.layerGroup().addTo(this.map);
    this.simplexPathsLayer = L.layerGroup().addTo(this.map);
    this.repeaterPathsLayer = L.layerGroup().addTo(this.map);

    // Add layer control
    const overlays = {
      'Stations': this.stationsLayer,
      'Simplex Paths': this.simplexPathsLayer,
      'Repeater Paths': this.repeaterPathsLayer
    };
    this.layerControl = L.control.layers(undefined, overlays, { collapsed: false }).addTo(this.map);

    this.initialized = true;
    this.updateMapData();
  }

  private updateMapData(): void {
    if (!this.initialized || !this.reports) return;

    // Clear existing layers
    this.stationsLayer.clearLayers();
    this.simplexPathsLayer.clearLayers();
    this.repeaterPathsLayer.clearLayers();

    // Extract stations and paths from reports
    const stations = this.extractStations();
    const paths = this.extractPaths();

    // Add station markers
    this.addStationMarkers(stations);

    // Add signal path lines
    this.addSignalPaths(paths);

    // Fit map to bounds if we have data
    if (stations.size > 0) {
      this.fitMapToBounds(stations);
    }
  }

  private extractStations(): Map<string, StationInfo> {
    const stations = new Map<string, StationInfo>();

    for (const report of this.reports) {
      // Add receiver station
      if (report.location?.latitude && report.location?.longitude) {
        const existing = stations.get(report.receiverCall);
        if (existing) {
          existing.reportsReceived++;
        } else {
          stations.set(report.receiverCall, {
            callSign: report.receiverCall,
            location: report.location,
            reportsReceived: 1,
            reportsTransmitted: 0
          });
        }
      }

      // We don't have transmitter location in the report, so we can only show
      // stations that have submitted reports (receivers)
    }

    return stations;
  }

  private extractPaths(): SignalPath[] {
    const pathMap = new Map<string, SignalPath>();

    for (const report of this.reports) {
      if (!report.location?.latitude || !report.location?.longitude) continue;

      // Create path key (sorted to make it bidirectional)
      const calls = [report.transmitterCall, report.receiverCall].sort();
      const key = `${calls[0]}-${calls[1]}`;

      const existing = pathMap.get(key);
      if (existing) {
        existing.count++;
        // Update to most recent signal strength
        existing.signalStrength = report.signalHeard;
      } else {
        // For now, we only have receiver location
        // We'll need to look up transmitter location from other reports
        const transmitterStation = this.findStationLocation(report.transmitterCall);

        if (transmitterStation) {
          pathMap.set(key, {
            fromCall: report.transmitterCall,
            toCall: report.receiverCall,
            fromLocation: transmitterStation,
            toLocation: report.location,
            signalStrength: report.signalHeard,
            count: 1,
            useRepeater: report.useRepeater,
            repeaterInfo: report.useRepeater ?
              `${report.repeaterCallSign || ''} ${report.repeaterFrequency || ''}`.trim() :
              undefined
          });
        }
      }
    }

    return Array.from(pathMap.values());
  }

  private findStationLocation(callSign: string): Location | null {
    // Look through reports to find this station's location
    // (when they were a receiver and logged their location)
    for (const report of this.reports) {
      if (report.receiverCall === callSign &&
          report.location?.latitude &&
          report.location?.longitude) {
        return report.location;
      }
    }
    return null;
  }

  private addStationMarkers(stations: Map<string, StationInfo>): void {
    const stationIcon = L.divIcon({
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

    stations.forEach((station, callSign) => {
      if (station.location.latitude && station.location.longitude) {
        const marker = L.marker(
          [station.location.latitude, station.location.longitude],
          { icon: stationIcon }
        );

        // Create popup content
        const popupContent = `
          <strong>${callSign}</strong><br>
          ${station.location.address || ''}<br>
          Reports received: ${station.reportsReceived}
        `;
        marker.bindPopup(popupContent);
        marker.bindTooltip(callSign, { permanent: false, direction: 'top' });

        this.stationsLayer.addLayer(marker);
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
      const weight = Math.min(2 + path.count, 6); // Thicker lines for more reports

      const polyline = L.polyline(latlngs, {
        color: color,
        weight: weight,
        opacity: 0.7
      });

      // Add popup with path info
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

  // Public method to refresh the map size (useful when container changes)
  public invalidateSize(): void {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 100);
    }
  }
}
