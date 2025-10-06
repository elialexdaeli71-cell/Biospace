import { Component, ElementRef, ViewChild, Renderer2, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-juego',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './juego.html',
  styleUrls: ['./juego.scss'],
})
export class JuegoComponent implements OnDestroy {
  // ===== Estado Kp =====
  private readonly KP_MAX = 9;
  private readonly CHARGE_RATE = 1.6; // Kp por segundo

  kp = signal(0); // 0..9
  kpRounded = computed(() => Math.round(this.kp()));
  get kpWidthPct() { return (this.kp() / 9) * 100; }

  // UI / textos (señales)
  incomingStatus = signal('Se aproxima: —');
  statusClass = signal<'status--idle' | 'status--low' | 'status--mid' | 'status--high'>('status--idle');
  eventTitle = signal('—');
  eventMsg = signal('Mantén presionado el Sol para cargar.');
  showAurora = signal(false);
  soundOn = signal(true);

  // Lista de efectos que se muestra con *ngFor
  effects: string[] = [];

  // Refs de escena
  @ViewChild('sunBtn', { static: true }) sunBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('stage', { static: true }) stage!: ElementRef<HTMLDivElement>;
  @ViewChild('plasmaLayer', { static: true }) plasmaLayer!: ElementRef<HTMLDivElement>;

  // Control de animación/carga
  private charging = false;
  private chargeRaf: number | null = null;
  private lastTs: number | null = null;

  // Liberación/partículas
  private releasing = false;
  private releaseLoopRaf: number | null = null;
  private releaseStartTs = 0;
  private releaseDuration = 0;
  private particles: Array<{ el: HTMLDivElement; sx: number; sy: number; ex: number; ey: number; sg: number; done: boolean; }> = [];

  // Sonido
  private sound = new SoundEngine();

  constructor(private r: Renderer2) {
    this.setKP(0);
    this.updateIncomingStatus();
    this.sound.setEnabled(true);
    this.sound.playAmbience();
  }

  /* ================== Interacciones ================== */
  onPointerDown(ev: PointerEvent) {
    ev.preventDefault();
    if (this.charging || this.releasing) return;
    this.charging = true;
    this.lastTs = null;
    this.sunBtn.nativeElement.classList.add('press');
    this.sound.startCharge();
    this.eventTitle.set('Cargando energía…');
    this.eventMsg.set('Mantén presionado. Suelta para liberar el plasma.');
    this.effects = [];
    this.chargeRaf = requestAnimationFrame(ts => this.chargeStep(ts));
  }

  onPointerUp(ev?: PointerEvent) {
    ev?.preventDefault();
    this.sound.stopCharge();
    if (!this.charging) return;
    this.charging = false;
    this.sunBtn.nativeElement.classList.remove('press');
    if (this.chargeRaf) cancelAnimationFrame(this.chargeRaf);
    const eventKp = Math.round(this.kp());
    if (eventKp < 1) {
      this.eventTitle.set('Energía insuficiente.');
      this.eventMsg.set('Mantén presionado por más tiempo para acumular energía Kp.');
      this.setKP(0);
      this.updateIncomingStatus();
      return;
    }
    this.triggerEvent(eventKp);
  }

  onPointerLeave() {
    if (this.charging) this.onPointerUp();
  }

  onReset() {
    this.charging = false;
    if (this.chargeRaf) cancelAnimationFrame(this.chargeRaf);
    this.releasing = false;
    if (this.releaseLoopRaf) cancelAnimationFrame(this.releaseLoopRaf);
    this.clearParticles();
    this.setKP(0);
    this.updateIncomingStatus();
    this.eventTitle.set('—');
    this.eventMsg.set('Mantén presionado el Sol para cargar.');
    this.effects = [];
    this.showAurora.set(false);
    this.sunBtn.nativeElement.classList.remove('press');
  }

  toggleSound() {
    const next = !this.soundOn();
    this.soundOn.set(next);
    this.sound.setEnabled(next);
  }

  /* ================== Lógica Kp/UI ================== */
  private setKP(v: number) {
    const clamped = Math.max(0, Math.min(this.KP_MAX, v));
    this.kp.set(clamped);
  }

  private kClass(k: number) {
    if (k <= 4) return { key: 'low' as const, titleMake: 'Has creado un <strong>viento solar</strong>.', titleIncoming: 'Se aproxima: <strong>Viento solar</strong>.', statusClass: 'status--low' as const };
    if (k <= 7) return { key: 'mid' as const, titleMake: 'Has creado una <strong>tormenta solar</strong>.', titleIncoming: 'Se aproxima: <strong>Tormenta solar</strong>.', statusClass: 'status--mid' as const };
    return { key: 'high' as const, titleMake: 'Has desatado un <strong>“huracán” solar</strong>.', titleIncoming: 'Se aproxima: <strong>“Huracán” solar</strong>.', statusClass: 'status--high' as const };
  }

  private updateIncomingStatus() {
    const k = Math.round(this.kp());
    if (k === 0) {
      this.statusClass.set('status--idle');
      this.incomingStatus.set('Se aproxima: —');
      return;
    }
    const cls = this.kClass(k);
    this.statusClass.set(cls.statusClass);
    this.incomingStatus.set(cls.titleIncoming);
  }

  private chargeStep(ts: number) {
    if (!this.charging) return;
    if (this.lastTs == null) this.lastTs = ts;
    const dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    this.setKP(this.kp() + this.CHARGE_RATE * dt);
    this.updateIncomingStatus();
    if (navigator.vibrate) {
      const k = Math.round(this.kp());
      if ([1, 5, 8].includes(k)) navigator.vibrate(10);
    }
    this.chargeRaf = requestAnimationFrame(t => this.chargeStep(t));
  }

  private drainToZero(durationMs = 1000) {
    const init = this.kp();
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const t = (ts - start) / durationMs;
      const val = init * (1 - Math.min(t, 1));
      this.setKP(val);
      this.updateIncomingStatus();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ================== Partículas/Evento ================== */
  private clearParticles() {
    this.particles.forEach(p => p.el.remove());
    this.particles.length = 0;
  }

  private triggerEvent(k: number) {
    this.spawnSynchronizedStream(k);
  }

  private spawnSynchronizedStream(k: number) {
    this.sound.playRelease(k);
    const rect = this.stage.nativeElement.getBoundingClientRect();

    const sunCX = 24 + 80;
    const sunCY = rect.height / 2;
    const earthCX = rect.width - 24 - 100;
    const earthCY = rect.height / 2;

    const N = Math.round(40 + k * 22);
    const SPAWN_WINDOW = 0.68;
    const SPREAD = 26 + k * 10;
    const ENTRY_DEPTH = 12 + Math.min(k, 9) * 1.5;

    this.releaseDuration = 2200 + k * 300;
    this.releaseStartTs = performance.now();
    this.releasing = true;

    this.drainToZero(this.releaseDuration);

    this.clearParticles();
    for (let i = 0; i < N; i++) {
      const sg = (N === 1 ? 0 : (i / (N - 1))) * SPAWN_WINDOW;
      const sx = sunCX + (Math.random() * 24 - 12);
      const sy = sunCY + (Math.random() * 24 - 12);
      const ex0 = earthCX + (Math.random() * SPREAD - SPREAD / 2);
      const ey0 = earthCY + (Math.random() * SPREAD - SPREAD / 2);
      const dx = earthCX - ex0, dy = earthCY - ey0;
      const len = Math.hypot(dx, dy) || 1;
      const ex = ex0 + (dx / len) * ENTRY_DEPTH;
      const ey = ey0 + (dy / len) * ENTRY_DEPTH;

      const el = this.r.createElement('div') as HTMLDivElement;
      el.className = 'proton';
      el.style.left = `${sx}px`;
      el.style.top = `${sy}px`;
      el.style.opacity = '0.95';
      el.style.transform = `translate(0px,0px)`;
      this.plasmaLayer.nativeElement.appendChild(el);

      this.particles.push({ el, sx, sy, ex, ey, sg, done: false });
    }

    const loop = (ts: number) => {
      if (!this.releasing) return;
      const g = clamp((ts - this.releaseStartTs) / this.releaseDuration, 0, 1);

      for (const p of this.particles) {
        if (p.done) continue;
        if (g < p.sg) continue;
        const u = clamp((g - p.sg) / (1 - p.sg), 0, 1);
        const s = smoothstep(u);
        const x = p.sx + (p.ex - p.sx) * s;
        const y = p.sy + (p.ey - p.sy) * s;
        p.el.style.transform = `translate(${x - p.sx}px, ${y - p.sy}px)`;
        if (u >= 1) {
          p.done = true;
          p.el.style.transition = 'opacity 420ms';
          p.el.style.opacity = '0.2';
          setTimeout(() => p.el.remove(), 450);
        }
      }

      if (g >= 1) {
        this.releasing = false;
        this.impactEarth(k);
        return;
      }
      this.releaseLoopRaf = requestAnimationFrame(loop);
    };
    this.releaseLoopRaf = requestAnimationFrame(loop);
  }

  private impactEarth(k: number) {
    this.sound.playImpact(k);
    const show = k >= 5;
    this.showAurora.set(show);
    if (navigator.vibrate) {
      const vib = k <= 4 ? 60 : k <= 7 ? 150 : 280;
      navigator.vibrate([40, 40, vib]);
    }
    const cls = this.kClass(k);
    this.eventTitle.set(cls.titleMake);
    const pool = ({ low: EFFECTS.low, mid: EFFECTS.mid, high: EFFECTS.high } as const)[cls.key];
    this.eventMsg.set(({ low: CONSEQUENCES.low, mid: CONSEQUENCES.mid, high: CONSEQUENCES.high } as const)[cls.key][Math.floor(Math.random() * 3)]);
    this.effects = pickRandom(pool, 3);
  }

  ngOnDestroy(): void {
    if (this.chargeRaf) cancelAnimationFrame(this.chargeRaf);
    if (this.releaseLoopRaf) cancelAnimationFrame(this.releaseLoopRaf);
    this.sound.setEnabled(false);
  }
}

/* ========= Utilidades ========= */
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function smoothstep(u: number) { return u * u * (3 - 2 * u); }
function pickRandom<T>(arr: ReadonlyArray<T>, n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

/* ========= Bancos de textos ========= */
const CONSEQUENCES = {
  low: [
    'Oh no… has provocado pequeñas perturbaciones: la señal de radio HF es intermitente.',
    'Oh no… el GPS presenta ligeros errores de posicionamiento.',
    'Oh no… los satélites aumentan su arrastre atmosférico levemente.'
  ],
  mid: [
    'Oh no… ¡fallas notables en telefonía y datos en regiones polares!',
    'Oh no… desvíos de rutas aéreas por interferencias en navegación.',
    'Oh no… degradación importante de GPS y radio VHF.'
  ],
  high: [
    'Oh no… ¡posibles apagones regionales por corrientes inducidas en redes eléctricas!',
    'Oh no… caída de comunicaciones satelitales y saturación de sensores.',
    'Oh no… tormenta geomagnética severa: sistemas de navegación inestables.'
  ]
} as const;

const EFFECTS = {
  low: [
    'Radio HF chisporrotea en altas latitudes.',
    'Auroras discretas cerca de los polos.',
    'Pequeñas fluctuaciones en magnetómetros.'
  ],
  mid: [
    'Auroras visibles a latitudes medias (¡advertencia!).',
    'Interferencias en GNSS/GPS.',
    'Retrasos en comunicaciones con satélites.'
  ],
  high: [
    'Riesgo de corrientes inducidas en redes eléctricas.',
    'Auroras a latitudes inusualmente bajas (¡advertencia!).',
    'Mayor arrastre en LEO: necesidad de correcciones orbitales.'
  ]
} as const;

/* ========= Motor de sonido (Web Audio) ========= */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;
  private _ambienceNodes: any = null;
  private _chargeNodes: any = null;

  private ensureContext() {
    if (!this.ctx) {
      // @ts-ignore - compatibilidad Safari (webkit)
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx!.state === 'suspended') this.ctx!.resume();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!this.master || !this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(on ? 0.9 : 0.0, this.ctx.currentTime + 0.05);
    if (!on) { this.stopCharge(); this.stopAmbience(); } else { this.playAmbience(); }
  }

  playAmbience() {
    if (!this.enabled) return;
    this.ensureContext();
    if (this._ambienceNodes || !this.ctx || !this.master) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator(); const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine'; osc2.type = 'sine'; osc1.frequency.value = 80; osc2.frequency.value = 81.2;

    const lfo = this.ctx.createOscillator(); const lfoGain = this.ctx.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 0.08; lfoGain.gain.value = 6;
    lfo.connect(lfoGain); lfoGain.connect(osc1.frequency); lfoGain.connect(osc2.frequency);

    const mix = this.ctx.createGain(); mix.gain.value = 0.08;
    osc1.connect(mix); osc2.connect(mix);

    const noiseBuf = this._makeNoiseBuffer(2);
    const noise = this.ctx.createBufferSource(); noise.buffer = noiseBuf; noise.loop = true;
    const band = this.ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 400; band.Q.value = 0.6;
    const noiseGain = this.ctx.createGain(); noiseGain.gain.value = 0.05;
    noise.connect(band); band.connect(noiseGain); noiseGain.connect(mix);

    mix.connect(this.master);
    [osc1, osc2, lfo, noise].forEach(n => n.start(t));
    this._ambienceNodes = { osc1, osc2, lfo, noise, mix };
  }

  stopAmbience() {
    if (!this._ambienceNodes || !this.ctx) return;
    const t = this.ctx.currentTime;
    const { osc1, osc2, lfo, noise, mix } = this._ambienceNodes;
    try { mix.gain.cancelScheduledValues(t); mix.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); } catch {}
    setTimeout(() => { [osc1, osc2, lfo, noise].forEach((n: any) => { try { n.stop(); } catch {} }); this._ambienceNodes = null; }, 160);
  }

  startCharge() {
    if (!this.enabled) return;
    this.ensureContext();
    if (this._chargeNodes || !this.ctx || !this.master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 1.2);

    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
    const g = this.ctx.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.12, t + 0.15);

    osc.connect(lp); lp.connect(g); g.connect(this.master);
    osc.start(t); this._chargeNodes = { osc, g };
  }

  stopCharge() {
    if (!this._chargeNodes || !this.ctx) return;
    const t = this.ctx.currentTime;
    const { osc, g } = this._chargeNodes;
    try { g.gain.cancelScheduledValues(t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); } catch {}
    setTimeout(() => { try { osc.stop(); } catch {} this._chargeNodes = null; }, 120);
  }

  playRelease(kpVal: number) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx || !this.master) return;

    const t = this.ctx.currentTime;
    const dur = 0.5 + Math.min(kpVal, 9) * 0.06;

    const noise = this.ctx.createBufferSource(); noise.buffer = this._makeNoiseBuffer(dur + 0.2);
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 250;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500;

    const g = this.ctx.createGain();
    const maxGain = 0.22 + kpVal * 0.02;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(maxGain, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    noise.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.master);
    noise.start(t); noise.stop(t + dur + 0.05);
  }

  playImpact(kpVal: number) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx || !this.master) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = 'sine';
    const startF = 90 + kpVal * 5; osc.frequency.setValueAtTime(startF, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.28);

    const g = this.ctx.createGain(); const peak = 0.18 + kpVal * 0.01;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 0.35);
  }

  private _makeNoiseBuffer(seconds = 1) {
    this.ensureContext();
    const sr = this.ctx!.sampleRate || 44100;
    const len = Math.max(1, Math.floor(sr * seconds));
    const buf = this.ctx!.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.85;
    return buf;
  }
}
