import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cuento',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cuento.component.html',
  styleUrls: ['./cuento.component.scss']
})
export class CuentoComponent {
  // LISTA COMPLETA DE IMÁGENES EN ORDEN
  images: string[] = [
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759669755/Imagen_de_WhatsApp_2025-10-05_a_las_08.06.45_919424c8_carytq.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678581/Imagen_de_WhatsApp_2025-10-05_a_las_10.05.32_7f8176fd_nauvcf.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678584/Imagen_de_WhatsApp_2025-10-05_a_las_10.06.06_d4f38205_a5rwcs.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678584/Imagen_de_WhatsApp_2025-10-05_a_las_10.06.35_b387ff53_nn5mwi.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678580/Imagen_de_WhatsApp_2025-10-05_a_las_10.07.10_3417abdd_mhieeo.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678580/Imagen_de_WhatsApp_2025-10-05_a_las_10.07.55_c9e84ef7_tvr372.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678579/Imagen_de_WhatsApp_2025-10-05_a_las_10.08.24_aad1381c_nvbu34.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678580/Imagen_de_WhatsApp_2025-10-05_a_las_10.09.10_93cb9697_eweyue.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678579/Imagen_de_WhatsApp_2025-10-05_a_las_10.09.45_3759ac47_lashwr.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759689671/Imagen_de_WhatsApp_2025-10-05_a_las_13.36.35_4bc313aa_lkyjmm.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678579/Imagen_de_WhatsApp_2025-10-05_a_las_10.11.17_c64d0fc9_meyipi.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678579/Imagen_de_WhatsApp_2025-10-05_a_las_10.11.38_d2bd4a87_tyj1zq.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678579/Imagen_de_WhatsApp_2025-10-05_a_las_10.12.11_a88f2e70_qdifbs.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678584/Imagen_de_WhatsApp_2025-10-05_a_las_10.12.41_14bdf409_g8dl5j.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678581/Imagen_de_WhatsApp_2025-10-05_a_las_10.13.02_d03b9792_gtdq4w.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678584/Imagen_de_WhatsApp_2025-10-05_a_las_10.13.07_01ba45e3_ynczlh.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678585/Imagen_de_WhatsApp_2025-10-05_a_las_10.13.17_82a7ff87_rtuc6i.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678584/Imagen_de_WhatsApp_2025-10-05_a_las_10.13.22_e9538d72_jvqtvx.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678586/Imagen_de_WhatsApp_2025-10-05_a_las_10.13.28_37cdd589_dtvkxn.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678586/Imagen_de_WhatsApp_2025-10-05_a_las_10.13.37_f2249170_j6gjht.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759689671/Imagen_de_WhatsApp_2025-10-05_a_las_13.36.48_06615161_fuxb5f.jpg',
    'https://res.cloudinary.com/ds757fmhk/image/upload/v1759678580/Imagen_de_WhatsApp_2025-10-05_a_las_10.15.40_9d2d81b9_wxpyrl.jpg'
  ];

  // ÍNDICE ACTUAL
  currentIndex = 0;

  get currentImage(): string {
    return this.images[this.currentIndex];
  }

  get totalImages(): number {
    return this.images.length;
  }

  get canPrev(): boolean {
    return this.currentIndex > 0;
  }

  get canNext(): boolean {
    return this.currentIndex < this.totalImages - 1;
  }

  get dots(): number[] {
    return Array(this.totalImages).fill(0).map((_, i) => i);
  }

  // FUNCIONES DE NAVEGACIÓN
  next(): void {
    if (this.canNext) {
      this.currentIndex++;
      console.log('Imagen actual:', this.currentIndex + 1);
    }
  }

  prev(): void {
    if (this.canPrev) {
      this.currentIndex--;
      console.log('Imagen actual:', this.currentIndex + 1);
    }
  }

  goToImage(index: number): void {
    if (index >= 0 && index < this.totalImages) {
      this.currentIndex = index;
      console.log('Ir a imagen:', this.currentIndex + 1);
    }
  }

  // TECLADO
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      this.next();
    } else if (event.key === 'ArrowLeft') {
      this.prev();
    }
  }

  // SWIPE PARA MÓVIL
  private touchStartX = 0;

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    const touchEndX = event.changedTouches[0].clientX;
    const diff = this.touchStartX - touchEndX;

    if (Math.abs(diff) > 50) { // Umbral mínimo para considerar swipe
      if (diff > 0) {
        this.next(); // Swipe izquierda
      } else {
        this.prev(); // Swipe derecha
      }
    }
  }
}