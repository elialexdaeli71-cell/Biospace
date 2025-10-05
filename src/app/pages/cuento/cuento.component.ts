import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

type Sheet = { frontVar: string; backVar: string; };

@Component({
  selector: 'app-cuento',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cuento.component.html',
  styleUrls: ['./cuento.component.scss']
})
export class CuentoComponent {
  // SOLO LA IMAGEN ESPECÍFICA EN TODAS LAS PÁGINAS
  sheets: Sheet[] = [
    { frontVar: 'var(--portada)', backVar: 'var(--portada)' },
    { frontVar: 'var(--portada)', backVar: 'var(--portada)' },
    { frontVar: 'var(--portada)', backVar: 'var(--portada)' },
    { frontVar: 'var(--portada)', backVar: 'var(--portada)' },
    { frontVar: 'var(--portada)', backVar: 'var(--portada)' }
  ];

  // Número de hojas volteadas (0 = portada cerrada)
  flipped = 0;
  private sliding = false;

  private swipeStartX = 0;

  get total(): number { return this.sheets.length; }
  get canPrev(): boolean { return this.flipped > 0; }
  get canNext(): boolean { return this.flipped < this.total; }
  progressPct(): number { return (this.flipped / this.total) * 100; }

  next(): void {
    if (!this.canNext || this.sliding) return;
    this.sliding = true;
    this.flipped++;
    setTimeout(() => (this.sliding = false), 720);
  }

  prev(): void {
    if (!this.canPrev || this.sliding) return;
    this.sliding = true;
    this.flipped--;
    setTimeout(() => (this.sliding = false), 720);
  }

  goTo(index: number): void {
    if (index < 0 || index > this.total) return;
    if (this.sliding) return;
    this.sliding = true;
    this.flipped = index;
    setTimeout(() => (this.sliding = false), 720);
  }

  onSheetClick(i: number) {
    if (i < this.flipped) this.prev();
    else if (i === this.flipped) this.next();
  }

  // Teclado
  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') this.next();
    if (e.key === 'ArrowLeft') this.prev();
  }

  // Swipe
  onTouchStart(ev: TouchEvent) { this.swipeStartX = ev.touches[0]?.clientX ?? 0; }
  onTouchEnd(ev: TouchEvent) {
    const endX = ev.changedTouches[0]?.clientX ?? this.swipeStartX;
    const dx = endX - this.swipeStartX;
    if (Math.abs(dx) > 48) (dx < 0 ? this.next() : this.prev());
  }
}