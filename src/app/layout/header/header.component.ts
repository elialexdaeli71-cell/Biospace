import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
  imports: [CommonModule, RouterModule]
})
export class HeaderComponent implements OnInit, OnDestroy {
  menuOpen = false;

  // carrusel de portada
  ci = 0;
  items = [0, 1, 2, 3, 4];

  // estás en /home
  isHome = false;

  private sub?: Subscription;
  private rotSub?: Subscription;

  // --- handler de scroll para activar la clase .is-scrolled en el header ---
  private scrollHandler = () => {
    const el = document.querySelector('.app-header') as HTMLElement | null;
    if (!el) return;
    if (window.scrollY > 8) el.classList.add('is-scrolled');
    else el.classList.remove('is-scrolled');
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    // detectar ruta y forzar evaluación de scroll
    this.sub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.isHome = e.urlAfterRedirects === '/home';
        this.scrollHandler();
        // cerrar menú al navegar
        this.menuOpen = false;
      });

    // auto-rotate carrusel
    this.rotSub = interval(4000).subscribe(() => (this.ci = (this.ci + 1) % this.items.length));

    // activar listener de scroll
    this.scrollHandler();
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.rotSub?.unsubscribe();
    window.removeEventListener('scroll', this.scrollHandler);
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
  setCi(i: number) {
    this.ci = i;
  }
  nav(url: string) {
    this.menuOpen = false;
    this.router.navigateByUrl(url);
  }
  goTo(url: string) {
    this.router.navigateByUrl(url);
  }
}
