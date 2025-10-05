import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    __ytApiReady?: Promise<void>;
  }
}

@Component({
  selector: 'app-audio-ambient',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-ambient.component.html',
  styleUrls: ['./audio-ambient.component.scss']
})
export class AudioAmbientComponent implements OnInit, OnDestroy {
  private player: any = null;
  private videoId = 'VLpkYuOmpSU';   // ID del video (no la URL)
  playing = false;
  muted = true;
  showHint = false;

  private firstGesture = () => {
    if (this.player) {
      try { this.player.playVideo(); } catch {}
      try { this.player.unMute(); this.muted = false; } catch {}
      this.showHint = false;
    }
    window.removeEventListener('pointerdown', this.firstGesture);
    window.removeEventListener('keydown', this.firstGesture);
  };

  async ngOnInit() {
    await this.loadYouTubeApi();
    this.initPlayer();

    // Si el navegador bloquea autoplay con sonido, al primer gesto activamos audio
    window.addEventListener('pointerdown', this.firstGesture, { once: true });
    window.addEventListener('keydown', this.firstGesture, { once: true });
  }

  ngOnDestroy() {
    try { this.player?.destroy?.(); } catch {}
    window.removeEventListener('pointerdown', this.firstGesture);
    window.removeEventListener('keydown', this.firstGesture);
  }

  // ---------- Controles UI ----------
  togglePlay() {
    if (!this.player) return;
    const state = this.player.getPlayerState?.(); // 1=PLAYING, 2=PAUSED
    if (state === 1) {
      this.player.pauseVideo();
      this.playing = false;
    } else {
      this.player.playVideo();
      this.playing = true;
    }
  }

  toggleMute() {
    if (!this.player) return;
    if (this.muted) {
      this.player.unMute();
      this.muted = false;
      this.showHint = false;
    } else {
      this.player.mute();
      this.muted = true;
    }
  }

  // ---------- YouTube IFrame API ----------
  private async loadYouTubeApi(): Promise<void> {
    // Ya está lista
    if (window.YT?.Player) return;

    // Reutiliza la promesa global si ya se pidió
    if (window.__ytApiReady) {
      await window.__ytApiReady;
      return;
    }

    // Carga única de la API oficial
    window.__ytApiReady = new Promise<void>((resolve) => {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => resolve();
    });

    await window.__ytApiReady;
  }

  private initPlayer() {
    const node = document.getElementById('yt-audio-ghost');
    if (!node || !window.YT?.Player) return;

    this.player = new window.YT.Player('yt-audio-ghost', {
      width: 1,
      height: 1,
      videoId: this.videoId,
      playerVars: {
        autoplay: 1,
        mute: 1,                // autoplay permitido al estar muteado
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        playsinline: 1,
        modestbranding: 1,
        loop: 1,
        playlist: this.videoId, // necesario para loop en YT
        origin: location.origin,
        enablejsapi: 1,
        iv_load_policy: 3
      },
      events: {
        onReady: (e: any) => {
          try {
            e.target.setVolume(55);
            e.target.mute();        // inicia silenciado
            e.target.playVideo();
            this.playing = true;
            this.muted = true;
            this.showHint = true;   // muestra tip para activar sonido
          } catch {}
        },
        onStateChange: (e: any) => {
          if (e.data === 1) this.playing = true;   // PLAYING
          if (e.data === 2) this.playing = false;  // PAUSED
          if (e.data === 0) {                       // ENDED (por si falla el loop)
            try { this.player.playVideo(); } catch {}
          }
        }
      }
    });
  }
}
