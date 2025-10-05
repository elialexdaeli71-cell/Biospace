import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/* ====== Interfaces para tipos ====== */
interface KClass {
  key: string;
  titleMake: string;
  titleIncoming: string;
  statusClass: string;
}

interface Particle {
  el: HTMLElement;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  sg: number;
  done: boolean;
}

interface AmbienceNodes {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  lfo: OscillatorNode;
  noise: AudioBufferSourceNode;
  mix: GainNode;
  band: BiquadFilterNode;
  noiseGain: GainNode;
}

interface ChargeNodes {
  osc: OscillatorNode;
  g: GainNode;
}

/* ====== Sonido espacial (Web Audio, sin archivos) ====== */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  public enabled: boolean = true;
  private _ambienceNodes: AmbienceNodes | null = null;
  private _chargeNodes: ChargeNodes | null = null;

  ensureContext(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master!.gain.value = 0.9;
      this.master!.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!this.master || !this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(on ? 0.9 : 0.0, this.ctx.currentTime + 0.05);
    if (!on) {
      this.stopCharge();
      this.stopAmbience();
    } else {
      this.playAmbience();
    }
  }

  playAmbience(): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    this.ensureContext();
    if (this._ambienceNodes) return;

    const t: number = this.ctx.currentTime;

    const osc1: OscillatorNode = this.ctx.createOscillator();
    const osc2: OscillatorNode = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 80;
    osc2.frequency.value = 81.2;

    const lfo: OscillatorNode = this.ctx.createOscillator();
    const lfoGain: GainNode = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    const mix: GainNode = this.ctx.createGain();
    mix.gain.value = 0.08;

    osc1.connect(mix);
    osc2.connect(mix);

    const noiseBuf: AudioBuffer = this._makeNoiseBuffer(2);
    const noise: AudioBufferSourceNode = this.ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;

    const band: BiquadFilterNode = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 400;
    band.Q.value = 0.6;

    const noiseGain: GainNode = this.ctx.createGain();
    noiseGain.gain.value = 0.05;

    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(mix);

    mix.connect(this.master);

    osc1.start(t);
    osc2.start(t);
    lfo.start(t);
    noise.start(t);

    this._ambienceNodes = { osc1, osc2, lfo, noise, mix, band, noiseGain };
  }

  stopAmbience(): void {
    if (!this._ambienceNodes || !this.ctx) return;
    const t: number = this.ctx.currentTime;
    const { osc1, osc2, lfo, noise, mix } = this._ambienceNodes;
    try {
      mix.gain.cancelScheduledValues(t);
      mix.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    } catch (e) { }
    setTimeout((): void => {
      [osc1, osc2, lfo, noise].forEach(n => { try { n.stop(); } catch (_) { } });
      this._ambienceNodes = null;
    }, 160);
  }

  startCharge(): void {
    if (!this.enabled) return;
    this.ensureContext();
    if (this._chargeNodes) return;

    if (!this.ctx || !this.master) return;

    const t: number = this.ctx.currentTime;

    const osc: OscillatorNode = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 1.2);

    const lp: BiquadFilterNode = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;

    const g: GainNode = this.ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.15);

    osc.connect(lp);
    lp.connect(g);
    g.connect(this.master);

    osc.start(t);
    this._chargeNodes = { osc, g };
  }

  stopCharge(): void {
    if (!this._chargeNodes || !this.ctx) return;
    const t: number = this.ctx.currentTime;
    const { osc, g } = this._chargeNodes;
    try {
      g.gain.cancelScheduledValues(t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    } catch (e) { }
    setTimeout((): void => {
      try { osc.stop(); } catch (_) { }
      this._chargeNodes = null;
    }, 120);
  }

  playRelease(kpVal: number): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    this.ensureContext();
    const t: number = this.ctx.currentTime;
    const dur: number = 0.5 + Math.min(kpVal, 9) * 0.06;

    const noise: AudioBufferSourceNode = this.ctx.createBufferSource();
    noise.buffer = this._makeNoiseBuffer(dur + 0.2);
    const hp: BiquadFilterNode = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 250;

    const lp: BiquadFilterNode = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 6500;

    const g: GainNode = this.ctx.createGain();
    const maxGain: number = 0.22 + kpVal * 0.02;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(maxGain, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    noise.connect(hp);
    hp.connect(lp);
    lp.connect(g);
    g.connect(this.master);

    noise.start(t);
    noise.stop(t + dur + 0.05);
  }

  playImpact(kpVal: number): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    this.ensureContext();
    const t: number = this.ctx.currentTime;

    const osc: OscillatorNode = this.ctx.createOscillator();
    osc.type = 'sine';
    const startF: number = 90 + kpVal * 5;
    osc.frequency.setValueAtTime(startF, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.28);

    const g: GainNode = this.ctx.createGain();
    const peak: number = 0.18 + kpVal * 0.01;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

    osc.connect(g);
    g.connect(this.master);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  private _makeNoiseBuffer(seconds: number = 1): AudioBuffer {
    const sr: number = this.ctx?.sampleRate || 44100;
    const len: number = Math.max(1, Math.floor(sr * seconds));
    const buf: AudioBuffer = this.ctx!.createBuffer(1, len, sr);
    const data: Float32Array = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.85;
    }
    return buf;
  }
}

@Component({
  selector: 'app-juego',
  templateUrl: './juego.html',
  styleUrls: ['./juego.scss'],
  imports: [CommonModule]
})
export class JuegoComponent implements OnInit, OnDestroy, AfterViewInit {
  /* ====== Estado del juego ====== */
  kp: number = 0;
  readonly KP_MAX: number = 9;
  
  // Textos del juego
  eventType: string = "—";
  eventMsg: string = "Mantén presionado el Sol para cargar.";
  effectsList: string[] = [];
  kpStatusText: string = "Se aproxima: —";
  kpStatusClass: string = "kp__status status--idle";
  soundOn: boolean = true;
  showAuroraBanner: boolean = false;

  // Para usar Math en el template
  Math = Math;

  /* ====== Referencias a elementos del DOM ====== */
  @ViewChild('kpValue') kpValueRef!: ElementRef<HTMLElement>;
  @ViewChild('kpFill') kpFillRef!: ElementRef<HTMLElement>;
  @ViewChild('kpStatus') kpStatusRef!: ElementRef<HTMLElement>;
  @ViewChild('btnReset') btnResetRef!: ElementRef<HTMLElement>;
  @ViewChild('btnSound') btnSoundRef!: ElementRef<HTMLElement>;
  @ViewChild('sun') sunBtnRef!: ElementRef<HTMLElement>;
  @ViewChild('stage') stageRef!: ElementRef<HTMLElement>;
  @ViewChild('plasmaLayer') plasmaLayerRef!: ElementRef<HTMLElement>;
  @ViewChild('aurora') auroraRef!: ElementRef<HTMLElement>;
  @ViewChild('alertAurora') alertAuroraRef!: ElementRef<HTMLElement>;
  @ViewChild('eventTypeEl') eventTypeRef!: ElementRef<HTMLElement>;
  @ViewChild('eventMsgEl') eventMsgRef!: ElementRef<HTMLElement>;
  @ViewChild('effectsList') effectsListRef!: ElementRef<HTMLElement>;

  /* ====== Estado interno ====== */
  private charging: boolean = false;
  private releasing: boolean = false;
  private chargeRaf: number | null = null;
  private releaseLoopRaf: number | null = null;
  private lastTs: number | null = null;
  private releaseStartTs: number = 0;
  private releaseDuration: number = 0;
  private particles: Particle[] = [];

  /* ====== Sistema de sonido ====== */
  private sound: SoundEngine = new SoundEngine();

  /* ====== Textos del juego ====== */
  private readonly CONSEQUENCES: { [key: string]: string[] } = {
    low: [
      "Oh no… has provocado pequeñas perturbaciones: la señal de radio HF es intermitente.",
      "Oh no… el GPS presenta ligeros errores de posicionamiento.",
      "Oh no… los satélites aumentan su arrastre atmosférico levemente."
    ],
    mid: [
      "Oh no… ¡fallas notables en telefonía y datos en regiones polares!",
      "Oh no… desvíos de rutas aéreas por interferencias en navegación.",
      "Oh no… degradación importante de GPS y radio VHF."
    ],
    high: [
      "Oh no… ¡posibles apagones regionales por corrientes inducidas en redes eléctricas!",
      "Oh no… caída de comunicaciones satelitales y saturación de sensores.",
      "Oh no… tormenta geomagnética severa: sistemas de navegación inestables."
    ]
  };

  private readonly EFFECTS: { [key: string]: string[] } = {
    low: [
      "Radio HF chisporrotea en altas latitudes.",
      "Auroras discretas cerca de los polos.",
      "Pequeñas fluctuaciones en magnetómetros."
    ],
    mid: [
      "Auroras visibles a latitudes medias (¡advertencia!).",
      "Interferencias en GNSS/GPS.",
      "Retrasos en comunicaciones con satélites."
    ],
    high: [
      "Riesgo de corrientes inducidas en redes eléctricas.",
      "Auroras a latitudes inusualmente bajas (¡advertencia!).",
      "Mayor arrastre en LEO: necesidad de correcciones orbitales."
    ]
  };

  ngOnInit(): void {
    this.initializeGame();
  }

  ngAfterViewInit(): void {
    // Asegurar que las referencias estén disponibles
    setTimeout(() => {
      this.updateIncomingStatus();
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializeGame(): void {
    this.setKP(0);
    this.updateIncomingStatus();
  }

  private cleanup(): void {
    this.charging = false;
    this.releasing = false;
    
    if (this.chargeRaf) {
      cancelAnimationFrame(this.chargeRaf);
    }
    
    if (this.releaseLoopRaf) {
      cancelAnimationFrame(this.releaseLoopRaf);
    }
    
    this.clearParticles();
    this.sound.setEnabled(false);
  }

  /* ====== Easing ====== */
  private clamp(n: number, min: number, max: number): number { 
    return Math.max(min, Math.min(max, n)); 
  }

  private smoothstep(u: number): number { 
    return u * u * (3 - 2 * u); 
  }

  private setKP(v: number): void {
    this.kp = this.clamp(v, 0, this.KP_MAX);
    this.updateKpDisplay();
  }

  private updateKpDisplay(): void {
    if (this.kpFillRef?.nativeElement) {
      this.kpFillRef.nativeElement.style.width = `${(this.kp / 9) * 100}%`;
    }
  }

  private kClass(k: number): KClass {
    if (k <= 4) return {
      key: 'low', 
      titleMake: 'Has creado un <strong>viento solar</strong>.',
      titleIncoming: 'Se aproxima: <strong>Viento solar</strong>.',
      statusClass: 'status--low'
    };
    if (k <= 7) return {
      key: 'mid', 
      titleMake: 'Has creado una <strong>tormenta solar</strong>.',
      titleIncoming: 'Se aproxima: <strong>Tormenta solar</strong>.',
      statusClass: 'status--mid'
    };
    return {
      key: 'high', 
      titleMake: 'Has desatado un <strong>"huracán" solar</strong>.',
      titleIncoming: 'Se aproxima: <strong>"Huracán" solar</strong>.',
      statusClass: 'status--high'
    };
  }

  updateIncomingStatus(): void {
    const k: number = Math.round(this.kp);
    if (k === 0) {
      this.kpStatusClass = 'kp__status status--idle';
      this.kpStatusText = 'Se aproxima: —';
      return;
    }
    const cls: KClass = this.kClass(k);
    this.kpStatusClass = `kp__status ${cls.statusClass}`;
    this.kpStatusText = cls.titleIncoming;
  }

  /* ====== Utilidades ====== */
  private pickRandom(arr: string[], n: number): string[] {
    const copy: string[] = [...arr];
    const out: string[] = [];
    for (let i = 0; i < n && copy.length; i++) {
      const idx: number = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }

  /* ====== Carga (press & hold) ====== */
  onSunPointerDown(event: Event): void {
    event.preventDefault();
    this.startCharging();
  }

  onSunPointerUp(event: Event): void {
    event.preventDefault();
    this.stopCharging(true);
  }

  onSunPointerLeave(event: Event): void {
    if (this.charging) this.stopCharging(false);
  }

  private chargeStep(ts: number): void {
    if (!this.charging) return;
    if (this.lastTs == null) this.lastTs = ts;
    const dt: number = (ts - this.lastTs) / 1000;
    this.lastTs = ts;

    this.setKP(this.kp + 1.6 * dt);
    this.updateIncomingStatus();

    if (navigator.vibrate) {
      const k: number = Math.round(this.kp);
      if ([1, 5, 8].includes(k)) navigator.vibrate(10);
    }

    this.chargeRaf = requestAnimationFrame((ts) => this.chargeStep(ts));
  }

  private startCharging(): void {
    if (this.charging || this.releasing) return;
    this.charging = true;
    this.lastTs = null;
    
    if (this.sunBtnRef?.nativeElement) {
      this.sunBtnRef.nativeElement.classList.add('press');
    }

    this.eventType = "Cargando energía…";
    this.eventMsg = "Mantén presionado. Suelta para liberar el plasma.";
    this.effectsList = [];

    this.sound.ensureContext();
    this.sound.playAmbience();
    this.sound.startCharge();

    this.chargeRaf = requestAnimationFrame((ts) => this.chargeStep(ts));
  }

  private stopCharging(triggerRelease: boolean = true): void {
    this.sound.stopCharge();
    if (!this.charging) return;
    this.charging = false;
    
    if (this.sunBtnRef?.nativeElement) {
      this.sunBtnRef.nativeElement.classList.remove('press');
    }
    
    if (this.chargeRaf) cancelAnimationFrame(this.chargeRaf);

    const eventKp: number = Math.round(this.kp);
    if (!triggerRelease || eventKp < 1) {
      this.eventType = "Energía insuficiente.";
      this.eventMsg = "Mantén presionado por más tiempo para acumular energía Kp.";
      this.setKP(0);
      this.updateIncomingStatus();
      return;
    }

    this.triggerEvent(eventKp);
  }

  /* ====== Drenaje suave de la barra ====== */
  private drainToZero(durationMs: number = 1000): void {
    const init: number = this.kp;
    let start: number | null = null;
    
    const step = (ts: number): void => {
      if (!start) start = ts;
      const t: number = (ts - start) / durationMs;
      const val: number = init * (1 - Math.min(t, 1));
      this.setKP(val);
      this.updateIncomingStatus();
      if (t < 1) requestAnimationFrame(step);
    };
    
    requestAnimationFrame(step);
  }

  /* ====== Sistema de partículas ====== */
  private clearParticles(): void {
    this.particles.forEach(p => {
      if (p.el && p.el.parentNode) {
        p.el.remove();
      }
    });
    this.particles = [];
  }

  /* ====== Flujo sincronizado ====== */
  private spawnSynchronizedStream(k: number): void {
    this.sound.playRelease(k);
    
    if (!this.stageRef?.nativeElement || !this.plasmaLayerRef?.nativeElement) return;
    
    const rect: DOMRect = this.stageRef.nativeElement.getBoundingClientRect();

    const sunCX: number = 24 + 80;
    const sunCY: number = rect.height / 2;
    const earthCX: number = rect.width - 24 - 100;
    const earthCY: number = rect.height / 2;

    const N: number = Math.round(40 + k * 22);
    const SPAWN_WINDOW: number = 0.68;
    const SPREAD: number = 26 + k * 10;
    const ENTRY_DEPTH: number = 12 + Math.min(k, 9) * 1.5;

    this.releaseDuration = 2200 + k * 300;
    this.releaseStartTs = performance.now();
    this.releasing = true;

    this.drainToZero(this.releaseDuration);

    this.clearParticles();
    
    for (let i = 0; i < N; i++) {
      const sg: number = (N === 1 ? 0 : (i / (N - 1))) * SPAWN_WINDOW;

      const sx: number = sunCX + (Math.random() * 24 - 12);
      const sy: number = sunCY + (Math.random() * 24 - 12);

      const ex0: number = earthCX + (Math.random() * SPREAD - SPREAD / 2);
      const ey0: number = earthCY + (Math.random() * SPREAD - SPREAD / 2);
      const dx: number = earthCX - ex0, dy: number = earthCY - ey0;
      const len: number = Math.hypot(dx, dy) || 1;
      const ex: number = ex0 + (dx / len) * ENTRY_DEPTH;
      const ey: number = ey0 + (dy / len) * ENTRY_DEPTH;

      const el: HTMLElement = document.createElement('div');
      el.className = 'proton';
      el.style.left = `${sx}px`;
      el.style.top = `${sy}px`;
      el.style.opacity = '0.95';
      el.style.transform = `translate(0px,0px)`;
      this.plasmaLayerRef.nativeElement.appendChild(el);

      this.particles.push({ el, sx, sy, ex, ey, sg, done: false });
    }

    const loop = (ts: number): void => {
      if (!this.releasing) return;
      const g: number = this.clamp((ts - this.releaseStartTs) / this.releaseDuration, 0, 1);

      for (const p of this.particles) {
        if (p.done) continue;
        if (g < p.sg) continue;
        const u: number = this.clamp((g - p.sg) / (1 - p.sg), 0, 1);
        const s: number = this.smoothstep(u);
        const x: number = p.sx + (p.ex - p.sx) * s;
        const y: number = p.sy + (p.ey - p.sy) * s;
        p.el.style.transform = `translate(${x - p.sx}px, ${y - p.sy}px)`;

        if (u >= 1) {
          p.done = true;
          p.el.style.transition = 'opacity 420ms';
          p.el.style.opacity = '0.2';
          setTimeout((): void => {
            if (p.el.parentNode) {
              p.el.remove();
            }
          }, 450);
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

  /* ====== Impacto en la Tierra y textos ====== */
  private impactEarth(k: number): void {
    this.sound.playImpact(k);
    const showAurora: boolean = k >= 5;
    
    if (this.auroraRef?.nativeElement) {
      if (showAurora) {
        this.auroraRef.nativeElement.classList.add('on');
      } else {
        this.auroraRef.nativeElement.classList.remove('on');
      }
    }
    
    this.showAuroraBanner = showAurora;

    if (navigator.vibrate) {
      const vib: number = k <= 4 ? 60 : k <= 7 ? 150 : 280;
      navigator.vibrate([40, 40, vib]);
    }
  }

  /* ====== Evento (al soltar) ====== */
  private triggerEvent(k: number): void {
    const cls: KClass = this.kClass(k);
    this.eventType = cls.titleMake;

    const bank: string[] = this.CONSEQUENCES[cls.key];
    this.eventMsg = bank[Math.floor(Math.random() * bank.length)];

    const effet: string[] = this.EFFECTS[cls.key];
    this.effectsList = this.pickRandom(effet, 3);

    this.spawnSynchronizedStream(k);
  }

  /* ====== Controladores públicos ====== */
  onReset(): void {
    this.charging = false;
    if (this.chargeRaf) cancelAnimationFrame(this.chargeRaf);
    this.releasing = false;
    if (this.releaseLoopRaf) cancelAnimationFrame(this.releaseLoopRaf);
    this.clearParticles();

    this.setKP(0);
    this.updateIncomingStatus();
    this.eventType = "—";
    this.eventMsg = "Mantén presionado el Sol para cargar.";
    this.effectsList = [];
    this.showAuroraBanner = false;
    
    if (this.auroraRef?.nativeElement) {
      this.auroraRef.nativeElement.classList.remove('on');
    }
    
    if (this.sunBtnRef?.nativeElement) {
      this.sunBtnRef.nativeElement.classList.remove('press');
    }
  }

  onToggleSound(): void {
    this.soundOn = !this.soundOn;
    this.sound.setEnabled(this.soundOn);
    
    if (this.btnSoundRef?.nativeElement) {
      this.btnSoundRef.nativeElement.classList.toggle('on', this.soundOn);
      this.btnSoundRef.nativeElement.setAttribute('aria-pressed', String(this.soundOn));
    }
  }
}