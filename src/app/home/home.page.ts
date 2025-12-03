import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import * as L from 'leaflet';
import { LocationService } from '../services/location';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/marker-icon-2x.png',
  iconUrl: 'assets/marker-icon.png',
  shadowUrl: 'assets/marker-shadow.png',
});

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule]
})
export class HomePage implements AfterViewInit {

  map: any;
  userMarker: any;
  taxiMarker: any;
  rutaLayer: any;

  userPosition: { lat: number; lon: number } | null = null;
  currentLocation: string = "";

  destinoEscrito: string = "";
  destinoCoords: { lat: number; lon: number } | null = null;

  kmRestantes: number | null = null;
  tiempoEstimado: number | null = null;
  precioEstimado: number | null = null;

  estadoViaje: 'esperando' | 'taxi_en_camino' | 'recogido' | 'en_viaje' | 'finalizado' = 'esperando';

  taxista = {
    nombre: "Raquel Corao",
    coche: "Mercedes Clase C",
    matricula: "1544-LJW"
  };

  taxiFixedLocation = {
    lat: 41.830015,
    lon: -1.252416
  };

  constructor(
    private locationService: LocationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngAfterViewInit() {
    this.loadMap();
  }

  // ======================================================
  //            MAPA
  // ======================================================
  loadMap() {
    this.map = L.map('map', { zoomControl: true }).setView([41.65, -0.88], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    setTimeout(() => this.map.invalidateSize(), 300);
  }

  // ======================================================
  //           UBICACIÓN + DIRECCIÓN REAL
  // ======================================================
  async getLocation() {
    try {
      const coords = await this.locationService.getCurrentLocation();

      this.userPosition = { lat: coords.latitude, lon: coords.longitude };

      const address = await this.reverseGeocode(coords.latitude, coords.longitude);
      this.currentLocation = address;

      if (!this.userMarker) {
        this.userMarker = L.marker([coords.latitude, coords.longitude]).addTo(this.map);
      } else {
        this.userMarker.setLatLng([coords.latitude, coords.longitude]);
      }

      this.map.setView([coords.latitude, coords.longitude], 14);

    } catch (error) {
      console.error('Error al obtener ubicación', error);
    }
  }

  // ======================================================
  //           PEDIR TAXI (TAXI → CLIENTE)
  // ======================================================
  async pedirTaxi() {
    if (!this.userPosition) {
      alert("Primero debes obtener tu ubicación");
      return;
    }

    const routeCoords = await this.drawRoute(this.taxiFixedLocation, this.userPosition);

    if (routeCoords) {
      this.calculateEstimates(routeCoords);
      this.animateTaxi(routeCoords);

      this.estadoViaje = "taxi_en_camino";
    }
  }

  // ======================================================
  //      INICIAR VIAJE COMPLETO (TAXI → CLIENTE → DESTINO)
  // ======================================================
  async iniciarViaje() {
    if (!this.userPosition || !this.destinoCoords) {
      alert("Faltan datos: ubicación o destino");
      return;
    }

    // 1️⃣ Ruta TAXI → CLIENTE
    const rutaTaxiCliente = await this.drawRoute(this.taxiFixedLocation, this.userPosition);
    if (!rutaTaxiCliente) return;

    this.estadoViaje = "taxi_en_camino";

    this.animateTaxiFull(rutaTaxiCliente, async () => {

      // 2️⃣ Cuando llega al cliente → CLIENTE → DESTINO
      this.estadoViaje = "en_viaje";

      const rutaClienteDestino = await this.drawRoute(this.userPosition!, this.destinoCoords!);
      if (!rutaClienteDestino) return;

      this.animateTaxiFull(rutaClienteDestino, () => {
        this.estadoViaje = "finalizado";
        alert("🎉 Viaje finalizado");
      });

    });
  }

  // ======================================================
  //       ANIMACIÓN COMPLETA DEL TAXI (CON CALLBACK)
  // ======================================================
  animateTaxiFull(coords: any[], onFinish?: Function) {
    let index = 0;

    if (this.taxiMarker) this.map.removeLayer(this.taxiMarker);
    this.taxiMarker = L.marker(coords[0]).addTo(this.map);

    const mover = () => {
      if (index >= coords.length) {
        if (onFinish) onFinish();
        return;
      }

      this.taxiMarker.setLatLng(coords[index]);
      this.map.panTo(coords[index]);

      // Actualizar panel en tiempo real
      if (index % 5 === 0) {
        const subRuta = coords.slice(index);
        this.calculateEstimates(subRuta);
      }

      index++;
      requestAnimationFrame(mover);
    };

    mover();
  }

  // ======================================================
  //           ANIMACIÓN BÁSICA
  // ======================================================
  async animateTaxi(coords: any[]) {
    let index = 0;

    if (this.taxiMarker) this.map.removeLayer(this.taxiMarker);

    this.taxiMarker = L.marker(coords[0]).addTo(this.map);

    const mover = () => {
      if (index >= coords.length) return;

      this.taxiMarker.setLatLng(coords[index]);
      this.map.panTo(coords[index]);

      index++;
      requestAnimationFrame(mover);
    };

    mover();
  }

  // ======================================================
  //           DIBUJAR RUTA
  // ======================================================
  async drawRoute(from: { lat: number; lon: number }, to: { lat: number; lon: number }) {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (data.code !== "Ok") {
      console.error("No se pudo calcular la ruta");
      return null;
    }

    const route = data.routes[0].geometry;

    this.calcularDetallesRuta(data);

    if (this.rutaLayer) this.map.removeLayer(this.rutaLayer);

    this.rutaLayer = L.geoJSON(route, {
      style: { color: "blue", weight: 5 }
    }).addTo(this.map);

    this.map.fitBounds(this.rutaLayer.getBounds());

    return route.coordinates.map((c: any) => [c[1], c[0]]);
  }

  // ======================================================
  //           CÁLCULOS DE KM, TIEMPO Y PRECIO
  // ======================================================
  calculateEstimates(routeCoords: any[]) {
    let dist = 0;

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const a = routeCoords[i];
      const b = routeCoords[i + 1];
      dist += this.haversine(a[0], a[1], b[0], b[1]);
    }

    this.kmRestantes = parseFloat(dist.toFixed(2));
    this.tiempoEstimado = Math.round((dist / 40) * 60); 
    this.precioEstimado = parseFloat((dist * 1.30).toFixed(2));
  }

  haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  calcularDetallesRuta(data: any) {
    const distanciaMetros = data.routes[0].distance;
    const duracionSegundos = data.routes[0].duration;

    this.kmRestantes = +(distanciaMetros / 1000).toFixed(2);
    this.tiempoEstimado = Math.round(duracionSegundos / 60);

    const precioBase = 3;
    const precioKm = 1.2;

    this.precioEstimado = +(precioBase + this.kmRestantes * precioKm).toFixed(2);
  }

  // ======================================================
  //           REVERSE GEOCODING
  // ======================================================
  async reverseGeocode(lat: number, lon: number) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

      const resp = await fetch(url, {
        headers: { "User-Agent": "TaxiCoraoApp - ChatGPT" }
      });

      const data = await resp.json();

      return data.display_name || "Dirección desconocida";

    } catch (e) {
      console.error("Error reverse geocode:", e);
      return "Dirección no disponible";
    }
  }

  // ======================================================
  //           GEOCODING
  // ======================================================
  async geocodeAddress(address: string) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

      const resp = await fetch(url, {
        headers: { "User-Agent": "TaxiCoraoApp - ChatGPT" }
      });

      const data = await resp.json();

      if (data.length === 0) return null;

      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };

    } catch (e) {
      console.error("Error geocoding:", e);
      return null;
    }
  }

  // ======================================================
  //           BUSCAR DESTINO
  // ======================================================
  async buscarDestino() {
    if (!this.destinoEscrito.trim()) {
      alert("Por favor escribe una dirección.");
      return;
    }

    const coords = await this.geocodeAddress(this.destinoEscrito);

    if (!coords) {
      alert("No se encontró esa dirección.");
      return;
    }

    this.destinoCoords = coords;

    alert(`Destino seleccionado: ${this.destinoEscrito}`);

    L.marker([coords.lat, coords.lon], { title: "Destino" }).addTo(this.map);

    if (!this.userPosition) {
      alert("Primero obtén tu ubicación");
      return;
    }

    const routeCoords = await this.drawRoute(this.userPosition, coords);
    if (!routeCoords) return;

    this.calculateEstimates(routeCoords);
    this.map.fitBounds(this.rutaLayer.getBounds());
  }

  // ======================================================
  //           LOGOUT
  // ======================================================
  async logout() {
    await this.authService.logout();
    this.router.navigate(['/auth']);
  }
}

