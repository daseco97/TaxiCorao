import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  constructor() {}

  async requestPermissions() {
    try {
      return await Geolocation.requestPermissions();
    } catch (err) {
      throw new Error("Error al pedir permisos: " + err);
    }
  }

  async getCurrentLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

    } catch (err) {
      throw new Error("Error al obtener ubicación: " + err);
    }
  }
}

