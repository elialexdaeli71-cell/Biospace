import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

declare const L: any; // usamos los scripts CDN (L global)

type City = { coords: [number, number]; title: string; popup: string };
type Countries = Record<string, City[]>;

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapa.html',
  styleUrls: ['./mapa.scss'],
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapRef', { static: true }) mapRef!: ElementRef<HTMLDivElement>;

  private map!: any;
  private markers!: any;
  private baseLayers!: Record<'osm'|'satellite'|'terrain', any>;
  private activeBaseKey: 'osm'|'satellite'|'terrain' = 'osm';

  // Datos (puedes moverlos a un servicio si quieres)
  private countriesData: Countries = {
    'Egipto': [
      { coords: [30.0444, 31.2357], title: 'El Cairo', popup: `
        <div class="map-popup">
          <h3>🇪🇬 El Cairo, Egipto</h3>
          <p><strong>Impacto:</strong> Temperaturas extremas y desertificación.</p>
          <p><strong>Acción:</strong> Agricultura sostenible y riego eficiente.</p>
          <p><strong>Δ Temp:</strong> +2.5°C desde 1980</p>
        </div>` },
      { coords: [27.1836, 31.1846], title: 'Luxor', popup: `
        <div class="map-popup">
          <h3>🇪🇬 Luxor, Egipto</h3>
          <p><strong>Impacto:</strong> Inundaciones repentinas erosionan sitios.</p>
          <p><strong>Acción:</strong> Infraestructura de protección cultural.</p>
          <p><strong>Precipitación extrema:</strong> +40%</p>
        </div>` },
      { coords: [31.2001, 29.9187], title: 'Alejandría', popup: `
        <div class="map-popup">
          <h3>🇪🇬 Alejandría, Egipto</h3>
          <p><strong>Impacto:</strong> Subida del nivel del mar.</p>
          <p><strong>Acción:</strong> Defensas costeras y reubicación planificada.</p>
          <p><strong>Nivel del mar:</strong> +15 cm desde 1990</p>
        </div>` },
    ],
    'Brasil': [
      { coords: [-22.9068, -43.1729], title: 'Río de Janeiro', popup: `
        <div class="map-popup">
          <h3>🇧🇷 Río de Janeiro, Brasil</h3>
          <p><strong>Impacto:</strong> Subida del mar y lluvias intensas.</p>
          <p><strong>Acción:</strong> Restauración de manglares y planeación resiliente.</p>
          <p><strong>Playas en riesgo:</strong> ~12 km</p>
        </div>` },
      { coords: [-23.5505, -46.6333], title: 'São Paulo', popup: `
        <div class="map-popup">
          <h3>🇧🇷 São Paulo, Brasil</h3>
          <p><strong>Impacto:</strong> Sequías afectan suministro de agua.</p>
          <p><strong>Acción:</strong> Gestión hídrica y reforestación.</p>
          <p><strong>Reservas:</strong> −35% última década</p>
        </div>` },
      { coords: [-3.1190, -60.0217], title: 'Manaus', popup: `
        <div class="map-popup">
          <h3>🇧🇷 Manaus, Brasil</h3>
          <p><strong>Impacto:</strong> Deforestación amazónica.</p>
          <p><strong>Acción:</strong> Protección de bosques y desarrollo sostenible.</p>
          <p><strong>Deforestación:</strong> +20% anual promedio</p>
        </div>` },
    ],
    'Alemania': [
      { coords: [52.5200, 13.4050], title: 'Berlín', popup: `
        <div class="map-popup">
          <h3>🇩🇪 Berlín, Alemania</h3>
          <p><strong>Impacto:</strong> Inundaciones y olas de calor.</p>
          <p><strong>Acción:</strong> Infraestructura verde y renovables.</p>
          <p><strong>Renovables:</strong> ~45% del consumo</p>
        </div>` },
      { coords: [48.1371, 11.5761], title: 'Múnich', popup: `
        <div class="map-popup">
          <h3>🇩🇪 Múnich, Alemania</h3>
          <p><strong>Impacto:</strong> Derretimiento de glaciares alpinos.</p>
          <p><strong>Acción:</strong> Transporte público y eficiencia.</p>
          <p><strong>Glaciares restantes:</strong> 4 de 12</p>
        </div>` },
      { coords: [53.5511, 9.9937], title: 'Hamburgo', popup: `
        <div class="map-popup">
          <h3>🇩🇪 Hamburgo, Alemania</h3>
          <p><strong>Impacto:</strong> Inundaciones costeras y tormentas.</p>
          <p><strong>Acción:</strong> Diques y alerta temprana.</p>
          <p><strong>Inversión:</strong> €500M/año</p>
        </div>` },
    ],
    'Estados Unidos': [
      { coords: [40.7128, -74.0060], title: 'Nueva York', popup: `
        <div class="map-popup">
          <h3>🇺🇸 Nueva York, USA</h3>
          <p><strong>Impacto:</strong> Super tormentas e inundaciones.</p>
          <p><strong>Acción:</strong> Infraestructura resiliente.</p>
          <p><strong>Daños desde 2012:</strong> $50B</p>
        </div>` },
      { coords: [34.0522, -118.2437], title: 'Los Ángeles', popup: `
        <div class="map-popup">
          <h3>🇺🇸 Los Ángeles, USA</h3>
          <p><strong>Impacto:</strong> Incendios y sequía.</p>
          <p><strong>Acción:</strong> Gestión forestal y ahorro de agua.</p>
          <p><strong>Área quemada:</strong> +300% desde 2000</p>
        </div>` },
    ],
    'India': [
      { coords: [28.6139, 77.2090], title: 'Nueva Delhi', popup: `
        <div class="map-popup">
          <h3>🇮🇳 Nueva Delhi, India</h3>
          <p><strong>Impacto:</strong> Contaminación y olas de calor.</p>
          <p><strong>Acción:</strong> Energías limpias y transporte eléctrico.</p>
          <p><strong>Calidad del aire:</strong> 20× sobre límites seguros</p>
        </div>` },
    ],
    'Australia': [
      { coords: [-33.8688, 151.2093], title: 'Sídney', popup: `
        <div class="map-popup">
          <h3>🇦🇺 Sídney, Australia</h3>
          <p><strong>Impacto:</strong> Blanqueamiento de corales e incendios.</p>
          <p><strong>Acción:</strong> Protección de ecosistemas marinos.</p>
          <p><strong>Arrecifes afectados:</strong> ~60%</p>
        </div>` },
    ],
  };

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    // Inicializamos fuera de Angular para que el pan/zoom no dispare CD
    this.zone.runOutsideAngular(() => this.initMap());
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  /* ---------- Map ---------- */
  private initMap(): void {
    // Base layers
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19, attribution: '&copy; OpenStreetMap' });

    const satellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      { maxZoom: 20, subdomains: ['mt0','mt1','mt2','mt3'], attribution: '&copy; Google' });

    const terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      { maxZoom: 17, attribution: '&copy; OpenTopoMap' });

    this.baseLayers = { osm, satellite, terrain };

    // Map
    this.map = L.map(this.mapRef.nativeElement, {
      center: [20, 0], zoom: 2, zoomControl: false, worldCopyJump: true, minZoom: 2, maxZoom: 18
    });

    osm.addTo(this.map);
    L.control.zoom({ position: 'topright' }).addTo(this.map);
    L.control.scale({ imperial: false }).addTo(this.map);

    // Cluster group
    this.markers = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false
    });

    // Add markers
    const customIcon = (emoji = '📍') => L.divIcon({
      html: `<div class="custom-marker">${emoji}</div>`,
      className: 'custom-div-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 30]
    });

    Object.keys(this.countriesData).forEach((country) => {
      this.countriesData[country].forEach((city) => {
        const m = L.marker(city.coords, { title: city.title, icon: customIcon() })
          .bindPopup(city.popup, { maxWidth: 420, minWidth: 280, className: 'custom-popup' });

        // eventos con arrow para evitar "this: any"
        m.on('click', (e: any) => {
          this.map.setView(city.coords, Math.max(this.map.getZoom(), 8));
          e.target.openPopup();
        });
        m.on('mouseover', (e: any) => e.target.openPopup());

        this.markers.addLayer(m);
      });
    });

    this.map.addLayer(this.markers);

    // Fit bounds
    setTimeout(() => {
      const group = new L.featureGroup(this.markers.getLayers());
      const b = group.getBounds();
      if (b.isValid()) this.map.fitBounds(b.pad(0.12));
    }, 400);
  }

  /* ---------- UI Actions ---------- */
  switchBase(key: 'osm'|'satellite'|'terrain') {
    if (this.activeBaseKey === key) return;
    this.map.removeLayer(this.baseLayers[this.activeBaseKey]);
    this.baseLayers[key].addTo(this.map);
    this.activeBaseKey = key;
  }

  recenter() {
    const group = new L.featureGroup(this.markers.getLayers());
    const b = group.getBounds();
    if (b.isValid()) this.map.flyToBounds(b.pad(0.12), { duration: 0.8 });
  }
}
