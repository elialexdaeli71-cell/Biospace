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

  items: Item[] = [
    { label:'Acerca',     path:'acerca',   icon:'ℹ️', hint:'Información del proyecto' },
    { label:'Problema',   path:'problema', icon:'❓', hint:'¿Por qué importa el clima espacial?' },
    { label:'Mapa',       path:'mapa',     icon:'🗺️', hint:'Explora datos y visualizaciones' },
    { label:'Tu Impacto', path:'impacto',  icon:'⚡', hint:'Cómo te afecta en la vida diaria' },
    { label:'Cuento', path:'cuento', icon:'📖', hint:'Relato educativo' },
    { label:'Juego',      path:'juego',    icon:'🎮', hint:'Aprende jugando' },
  ];

  constructor(private router: Router){
    // Cierra el popover al navegar
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.open = false);
  }

  toggle(){ this.open = !this.open; }

  go(path: string){
    this.open = false;
    this.router.navigateByUrl('/' + path);
  }

  // Clic fuera => cierra
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent){
    const target = ev.target as HTMLElement | null;
    if (target && !target.closest('.fab-menu')) this.open = false;
  }

  // Accesibilidad de teclado en la lista
  onListKeydown(e: KeyboardEvent){
    if (e.key === 'Escape'){ this.open = false; return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      const btns = Array.from(document.querySelectorAll<HTMLButtonElement>('.fab-menu .list .item'));
      if (!btns.length) return;
      const active = document.activeElement as HTMLElement | null;
      let idx = Math.max(0, btns.findIndex(b => b === active));
      idx = e.key === 'ArrowDown' ? (idx + 1) % btns.length : (idx - 1 + btns.length) % btns.length;
      btns[idx].focus();
    }
  }

  onItemKeydown(e: KeyboardEvent, i: number){
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      this.go(this.items[i].path);
    }
  }
}
