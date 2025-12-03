import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
})
export class AuthPage {

  email: string = '';
  password: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async login() {
    try {
      await this.authService.login(this.email, this.password);
      alert("✔ Sesión iniciada");
      this.router.navigate(['/home']);
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    }
  }

  async register() {
    try {
      await this.authService.register(this.email, this.password);
      alert("✔ Cuenta creada");
      this.router.navigate(['/home']);
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    }
  }
}
