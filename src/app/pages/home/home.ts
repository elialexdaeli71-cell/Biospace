import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('bgVideo', { static: true }) bgVideo!: ElementRef<HTMLVideoElement>;

  ngAfterViewInit(): void {
    const v = this.bgVideo.nativeElement;

    // Asegurar mudo/inline para iOS y que el autoplay sea elegible
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute('muted', '');           // algunos Safari requieren el atributo presente
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');

    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          // Si falla, lo intentaremos al primer gesto del usuario.
        });
      }
    };

    // 1) Intento inmediato
    tryPlay();

    // 2) Reintentos suaves (p. ej. si el video aún no estaba listo)
    let retries = 5;
    const retryTimer = setInterval(() => {
      if (!v.paused || retries <= 0) return clearInterval(retryTimer);
      tryPlay();
      retries--;
    }, 600);

    // 3) Cuando la pestaña vuelve a ser visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) tryPlay();
    });

    // 4) Primer gesto del usuario (garantiza reproducción en políticas estrictas)
    const gestureEvents = ['pointerdown', 'touchstart', 'click', 'keydown', 'scroll'];
    const gestureHandler = () => {
      tryPlay();
      gestureEvents.forEach(ev =>
        document.removeEventListener(ev, gestureHandler, { capture: true } as any)
      );
    };
    gestureEvents.forEach(ev =>
      document.addEventListener(ev, gestureHandler, { once: true, passive: true, capture: true } as any)
    );
  }
}
