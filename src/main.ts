import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// --- Firebase Web SDK ---
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBdBQntW_nSXh86T1m6HVDpnY0jXONBsGM",
  authDomain: "taxicoraoapp.firebaseapp.com",
  projectId: "taxicoraoapp",
  storageBucket: "taxicoraoapp.firebasestorage.app",
  messagingSenderId: "759815211390",
  appId: "1:759815211390:web:be9b4687cbe08e5f898b2f",
  measurementId: "G-J5WX4PEVDY"
};

// Inicializar Firebase
initializeApp(firebaseConfig);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});


