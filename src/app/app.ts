// src/app/app.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet, NavigationEnd } from '@angular/router';

import { HeaderComponent } from './layout/header/header.component';
import { MenuComponent }   from './pages/menu/menu.component';
import { FooterComponent } from './layout/footer/footer';

// Flotantes (déjalos solo si existen)
import { SpaceBotComponent } from './pages/ia/space-bot/space-bot';
import { VoiceNavComponent } from './pages/ia/voice-nav/voice-nav';

// ✅ NUEVO: Audio ambiental global (solo audio de YouTube)
import { AudioAmbientComponent } from './pages/audio-ambient/audio-ambient.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    HeaderComponent,
    MenuComponent,
    FooterComponent,
    SpaceBotComponent,
    VoiceNavComponent,
    AudioAmbientComponent,
  ]
})
export class AppComponent implements OnInit {

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Aplica clase al body según ruta: home => video, resto => imagen Cloudinary
    const applyBgClass = (url: string) => {
      const path = (url || '').replace(/^\//,'').split('?')[0];
      const isHome = path === '' || path === 'home' || path === 'inicio';
      document.body.classList.toggle('bg-home', isHome);
      document.body.classList.toggle('bg-alt', !isHome);
    };

    applyBgClass(this.router.url);
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd) applyBgClass(ev.urlAfterRedirects || ev.url);
    });
  }
}
