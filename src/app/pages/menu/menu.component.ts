import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface Item { label: string; path: string; icon: string; hint?: string; }

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent {
  open = false;
  private autoCloseTimer: any;

  items: Item[] = [
    { label:'Acerca',     path:'acerca',   icon:'ℹ️', hint:'Información del proyecto' },
    { label:'Problema',   path:'problema', icon:'❓', hint:'¿Por qué importa el clima espacial?' },
    { label:'Mapa',       path:'mapa',     icon:'🗺️', hint:'Explora datos y visualizaciones' },
    { label:'Tu Impacto', path:'impacto',  icon:'⚡', hint:'Cómo te afecta en la vida diaria' },
    { label:'Cuento', path:'cuento', icon:'📖', hint:'Relato educativo' },
    { label:'Juego',      path:'juego',    icon:'🎮', hint:'Aprende jugando' },
  ];

  particles = this.generateParticles(12);

  constructor(private router: Router){
    // Cierra el popover al navegar
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.open = false;
        this.clearAutoClose();
      });
  }

  toggle(){ 
    this.open = !this.open;
    
    if (this.open) {
      // Regenerar partículas para el efecto de erupción
      this.particles = this.generateParticles(12);
      
      // Cerrar automáticamente después de 8 segundos
      this.autoCloseTimer = setTimeout(() => {
        this.open = false;
      }, 8000);
    } else {
      this.clearAutoClose();
    }
  }

  go(path: string){
    this.open = false;
    this.clearAutoClose();
    this.router.navigateByUrl('/' + path);
  }

  // Posicionamiento de planetas en media órbita
  getPlanetPosition(index: number): string {
    const totalItems = this.items.length;
    const angle = (index / totalItems) * 180; // Solo 180 grados (media órbita)
    const radius = 200;
    const x = Math.cos(angle * Math.PI / 180) * radius;
    const y = Math.sin(angle * Math.PI / 180) * radius;
    return `translate(${x}px, ${y}px)`;
  }

  // Delay para animaciones
  getAnimationDelay(index: number): string {
    return `${index * 0.1}s, ${3 + index * 0.5}s`; // Aparece inmediato, carrusel después de 3s
  }

  // Generar partículas para efecto de erupción
  generateParticles(count: number): any[] {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 360;
      const distance = 60 + Math.random() * 30;
      const tx = Math.cos(angle * Math.PI / 180) * distance;
      const ty = Math.sin(angle * Math.PI / 180) * distance;
      
      particles.push({
        x: 40,
        y: 40,
        tx: tx,
        ty: ty
      });
    }
    return particles;
  }

  onPlanetHover(index: number): void {
    // Reiniciar el timer de cierre automático cuando interactúan con los planetas
    this.clearAutoClose();
    if (this.open) {
      this.autoCloseTimer = setTimeout(() => {
        this.open = false;
      }, 3000);
    }
  }

  clearAutoClose(): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
  }

  // Clic fuera => cierra
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent){
    const target = ev.target as HTMLElement | null;
    if (target && !target.closest('.fab-menu')) {
      this.open = false;
      this.clearAutoClose();
    }
  }

  // Teclado
  @HostListener('document:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent){
    if (ev.key === 'Escape' && this.open) {
      this.open = false;
      this.clearAutoClose();
    }
  }

  ngOnDestroy(): void {
    this.clearAutoClose();
  }
}