import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  private db: any;

  constructor() {
    const firebaseConfig = {
      apiKey: "AIzaSyBdBQntW_nSXh86T1m6HVDpnY0jXONBsGM",
      authDomain: "taxicoraoapp.firebaseapp.com",
      projectId: "taxicoraoapp",
      storageBucket: "taxicoraoapp.firebasestorage.app",
      messagingSenderId: "759815211390",
      appId: "1:759815211390:web:be9b4687cbe08e5f898b2f",
      measurementId: "G-J5WX4PEVDY"
    };

    const app = initializeApp(firebaseConfig);
    this.db = getFirestore(app);
  }

  async testWrite() {
    return addDoc(collection(this.db, "test"), {
      mensaje: "Hola desde Ionic!",
      fecha: new Date().toISOString()
    });
  }

}
