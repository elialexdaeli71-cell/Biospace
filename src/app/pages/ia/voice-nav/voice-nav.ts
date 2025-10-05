import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';

type MicState = 'unknown'|'granted'|'denied'|'prompt';

@Component({
  selector: 'app-voice-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-nav.html',
  styleUrls: ['./voice-nav.scss']
})
export class VoiceNavComponent implements OnInit {
  // ===== UI =====
  isListening = false;
  lastHeard = '';
  introOpen = false;
  disabledBanner = false;
  speaking = false;

  // ===== Mic =====
  micState: MicState = 'unknown';
  private rec: any = null;
  private wakeRec: any = null;
  private wakeMode = false;

  // ===== Control =====
  private optedKey = 'voiceNav.optin';
  private pressTimer: any = null;
  private consumedClick = false;
  private pendingAnchor: string | null = null;

  // ===== Contenido de la intro (se muestra y se narra) =====
  features = [
    { icon:'ℹ️', title:'Acerca',     desc:'Qué es BIOSPACE y cuál es nuestra misión.' },
    { icon:'🌋', title:'Problema',   desc:'Qué es el clima espacial y por qué importa.' },
    { icon:'🗺️', title:'Mapa',       desc:'Explora visualizaciones y datos interactivos.' },
    { icon:'⚡', title:'Tu Impacto', desc:'Calcula una estimación rápida de tu huella.' },
    { icon:'🎮', title:'Juego',      desc:'Aprende jugando con misiones y minijuegos.' },
    { icon:'📖', title:'Cuento',     desc:'Relato educativo para peques sobre el Sol.' },
    { icon:'🤖', title:'IA Solar',   desc:'Haz preguntas en lenguaje natural.' },
  ];

  // ===== Texto corto por página (se narra al llegar) =====
  private sectionIntro: Record<string,string> = {
    'home':     'Inicio de Biospace. Aquí arrancamos la aventura espacial.',
    'acerca':   'Acerca de Biospace: qué somos y qué buscamos.',
    'problema': 'Problemática: qué es el clima espacial y por qué importa.',
    'mapa':     'Mapa: explora visualizaciones y datos.',
    'impacto':  'Impacto: cómo nos afecta en la vida diaria.',
    'juego':    'Juego: practica con minijuegos del clima espacial.',
    'cuento':   'Cuento: un relato para aprender del clima espacial.',
    'ia':       'IA Solar: haz preguntas y aprende jugando.'
  };

  // ===== Palabras que disparan cada ruta =====
  private routeKeywords: Record<string,string[]> = {
    home:     ['inicio','home','principal','portada'],
    acerca:   ['acerca','sobre','informacion','información','nosotros','quienes somos'],
    problema: ['problema','problematica','problemática'],
    mapa:     ['mapa','mapita','mapa interactivo'],
    impacto:  ['impacto','tu impacto','afectacion','afectación','efectos'],
    juego:    ['juego','jugar','minijuego'],
    cuento:   ['cuento','historia','relato','cuento infantil'],
    ia:       ['ia','robot','asistente','chat','ia solar']
  };

  // ===== Alias de anclas (IDs) para scroll por voz =====
  // En "cuento" tienes: presentacion, cap1, cap2, cap3, cap4, cta
  private anchorAliases: Record<string,string[]> = {
    presentacion: ['presentación','presentacion','intro','banner'],
    mision: ['mision','misión','objetivo'],
    caracteristicas: ['caracteristicas','características','features'],
    pasos: ['pasos','como funciona','cómo funciona','flujo'],
    cta: ['cta','llamado','listo','despegar','final'],
    cap1: ['capitulo 1','capítulo 1','capitulo uno','capítulo uno','la chispa','primer capitulo','primer capítulo'],
    cap2: ['capitulo 2','capítulo 2','capitulo dos','capítulo dos','viento solar','segundo capitulo','segundo capítulo'],
    cap3: ['capitulo 3','capítulo 3','capitulo tres','capítulo tres','tormenta','tercer capitulo','tercer capítulo'],
    cap4: ['capitulo 4','capítulo 4','capitulo cuatro','capítulo cuatro','promesa','cuarto capitulo','cuarto capítulo']
  };

  constructor(private router: Router) {}

  // ===================== INIT =====================
  async ngOnInit() {
    try {
      const qs = new URLSearchParams(location.search);
      if (qs.get('reset-voice') === '1') localStorage.removeItem(this.optedKey);
    } catch {}

    await this.checkMicState();

    // Ejecutar anclas pendientes al terminar navegación + hablar intro de sección
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd && this.pendingAnchor) {
        const target = this.pendingAnchor; this.pendingAnchor = null;
        setTimeout(() => this.tryAnchor(target), 350);
        const p = (ev.urlAfterRedirects || ev.url).replace(/^\//,'').split('?')[0] || 'home';
        this.speakSection(p);
      }
    });

    const saved = localStorage.getItem(this.optedKey);
    if (saved === 'yes') {
      if (await this.ensureMic()) {
        await this.saySeq('Bienvenido a Biospace.','Di: por favor para hablar cuando quieras.');
        this.wakeMode = true; this.startWakeWord();
      } else {
        this.disabledBanner = true;
        this.say('Necesito permiso del micrófono para escucharte.');
      }
    } else if (saved === 'no') {
      this.disabledBanner = true;
    } else {
      // Mostrar onboarding y narrar una intro corta automáticamente
      this.introOpen = true;
      await this.playIntro();
    }
  }

  // ===================== PERMISOS MIC =====================
  private async checkMicState() {
    try {
      const nav: any = navigator as any;
      if (nav.permissions?.query) {
        const status = await nav.permissions.query({ name: 'microphone' as any });
        this.micState = (status.state as MicState) ?? 'prompt';
        status.onchange = () => this.micState = (status.state as MicState) ?? 'prompt';
      } else this.micState = 'prompt';
    } catch { this.micState = 'prompt'; }
  }
  private async requestMic(): Promise<boolean> {
    try {
      const md = navigator.mediaDevices;
      if (!md?.getUserMedia) return false;
      const stream = await md.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      this.micState = 'granted';
      return true;
    } catch { this.micState = 'denied'; return false; }
  }
  private async ensureMic() { return this.micState === 'granted' ? true : this.requestMic(); }

  // ===================== INTRO =====================
  async playIntro(){
    if (this.speaking) return;
    this.speaking = true;
    await this.saySeq(
      'Esto es Biospace.',
      'Podrás conocer el clima espacial y su impacto.',
      'Tenemos: Acerca, Problema, un Mapa interactivo, Tu Impacto, Juego, un Cuento para peques e I A Solar.',
      'Cuando quieras, presiona Empezar con mi voz o di: Permitir micrófono.'
    );
    this.speaking = false;
  }

  async accept() {
    const ok = await this.ensureMic();
    if (!ok) {
      this.say('No tengo permiso. Revisa los permisos del sitio y vuelve a intentarlo.');
      this.disabledBanner = true;
      this.introOpen = false;
      localStorage.setItem(this.optedKey, 'no');
      return;
    }
    localStorage.setItem(this.optedKey, 'yes');
    this.introOpen = false; this.disabledBanner = false;
    await this.saySeq('Listo. Micrófono habilitado.','Di: por favor para despertarme.','Te escucho.');
    this.wakeMode = true; this.startWakeWord(); this.start();
  }
  decline() {
    localStorage.setItem(this.optedKey, 'no');
    this.introOpen = false; this.disabledBanner = true;
    this.say('De acuerdo. Puedes activarme desde el botón de micrófono cuando quieras.');
  }
  openReEnable(){ this.introOpen = true; this.disabledBanner = false; }

  // ===================== UI MIC =====================
  onPressStart(_: any){ this.consumedClick = false; clearTimeout(this.pressTimer); this.pressTimer = setTimeout(()=>{ this.consumedClick = true; this.openReEnable(); },700); }
  onPressEnd(){ clearTimeout(this.pressTimer); this.pressTimer = null; }
  async toggle(){ if (this.consumedClick){ this.consumedClick=false; return; } if (this.micState !== 'granted'){ await this.accept(); return;} this.isListening? this.stop(): this.start(); }

  private start() {
    const W: any = window as any;
    const Rec = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Rec){ this.lastHeard = 'Tu navegador no soporta reconocimiento de voz.'; this.say(this.lastHeard); return; }
    if (this.micState !== 'granted'){ this.say('Primero permite el micrófono.'); return; }

    this.stopWakeWord();
    const rec = new Rec(); this.rec = rec;
    rec.lang='es-MX'; rec.interimResults=false; rec.maxAlternatives=1;
    rec.onresult = (e:any)=>{ const said = e?.results?.[0]?.[0]?.transcript||''; this.lastHeard='👂 '+said; this.handleCommand(said); };
    rec.onend = ()=>{ this.isListening=false; if (this.wakeMode) this.startWakeWord(); };
    rec.onerror = ()=>{ this.isListening=false; if (this.wakeMode) this.startWakeWord(); };
    this.isListening = true; try{ rec.start(); }catch{}
  }
  private stop(){ try{ this.rec?.stop?.(); }catch{} this.isListening=false; if (this.wakeMode) this.startWakeWord(); }

  // ===================== HOTWORD =====================
  private startWakeWord(){
    const W:any = window as any; const Rec = W.SpeechRecognition||W.webkitSpeechRecognition;
    if (!Rec || this.isListening || this.micState!=='granted') return;
    this.stopWakeWord();
    const rec = new Rec(); this.wakeRec = rec;
    rec.lang='es-MX'; rec.interimResults=false; rec.maxAlternatives=1;
    rec.onresult=(e:any)=>{ const s=this.norm(e?.results?.[0]?.[0]?.transcript||''); if(/\b(por\s*favor|porfavor)\b/.test(s)){ this.say('Te escucho.'); this.stopWakeWord(); this.start(); } };
    rec.onend=()=>{ if(!this.isListening && this.wakeMode){ try{rec.start();}catch{ setTimeout(()=>this.startWakeWord(),400);} } };
    rec.onerror=()=>{ if(this.wakeMode) setTimeout(()=>this.startWakeWord(),600); };
    try{ rec.start(); }catch{}
  }
  private stopWakeWord(){ try{ this.wakeRec?.stop?.(); }catch{} this.wakeRec=null; }

  // ===================== COMANDOS =====================
  private handleCommand(raw: string){
    const s = this.norm(raw);

    // Ayuda
    if (/\b(ayuda|que puedes hacer|qué puedes hacer|como te uso)\b/.test(s)){
      this.say('Puedo llevarte a inicio, acerca, problema, mapa, impacto, juego, cuento o i a; y a secciones como misión, características, pasos o capítulos del cuento. Di por favor para despertarme.');
      return;
    }

    // Scroll simple
    if (/\b(pie|abajo|final|footer|bajar|desplazar.*abajo)\b/.test(s)){ try{ window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});}catch{} this.say('Bajando al pie de página.'); return; }
    if (/\b(arriba|inicio\s*de\s*p[aá]gina|subir|top)\b/.test(s)){ try{ window.scrollTo({top:0,behavior:'smooth'});}catch{} this.say('Subiendo al inicio.'); return; }

    // Ruta + posible ancla
    const route = this.detectRoute(s);
    const anchor = this.detectAnchorLabel(s);

    if (route){
      if (anchor){ this.pendingAnchor = anchor; }
      this.say('Vamos a ' + route + '.');
      this.router.navigateByUrl('/'+route);
      return;
    }

    // Solo ancla dentro de la página actual
    if (anchor){
      if (this.tryAnchor(anchor)) return;
      this.say('No encontré ese apartado.');
      return;
    }

    this.say('No te entendí. Prueba con: llévame al mapa, a acerca, al juego o al cuento; o di: ir a misión, características, pasos o capítulo uno.');
  }

  private detectRoute(s: string): string | null {
    const intent = /\b(ir|llevar|vamos|abre|abrir|quiero|ll[ée]vame)\b/.test(s);
    for (const [route, keys] of Object.entries(this.routeKeywords)){
      if (keys.some(k => s.includes(this.norm(k))) || (intent && s.includes(route))) return route;
    }
    return null;
  }

  private detectAnchorLabel(s: string): string | null {
    const m = s.match(/\b(seccion|sección|apartado|bloque|parte|capitulo|capítulo)\s+([a-z0-9\s]+)/);
    if (m) return m[2];
    for (const [id, aliases] of Object.entries(this.anchorAliases)){
      if (aliases.some(a => s.includes(this.norm(a)))) return id;
    }
    return null;
  }

  private tryAnchor(label: string): boolean {
    const key = this.norm(label);
    // 1) Alias conocidos
    for (const [id, aliases] of Object.entries(this.anchorAliases)){
      if (id === key || aliases.map(a=>this.norm(a)).some(a => a===key)){ return this.scrollToId(id); }
    }
    // 2) Búsqueda por id aproximado
    const els = Array.from(document.querySelectorAll<HTMLElement>('[id]'));
    let candidate: HTMLElement | null = null;
    for (const el of els){
      const idn = this.norm(el.id);
      if (idn===key || idn.includes(key) || key.includes(idn)){ candidate = el; break; }
    }
    if (candidate){ candidate.scrollIntoView({behavior:'smooth', block:'start'}); this.say('Yendo a '+(candidate.id||'la sección')); return true; }
    return false;
  }
  private scrollToId(id: string){ const el=document.getElementById(id); if(!el) return false; el.scrollIntoView({behavior:'smooth',block:'start'}); this.say('Yendo a '+id.replace(/-/g,' ')); return true; }
  private speakSection(path: string){ const key=(path||'home').toLowerCase(); const msg=this.sectionIntro[key]; if (msg) this.say(msg); }

  // ===================== TTS helpers =====================
  private norm(t:string){ return (t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim(); }
  private async waitVoices(timeout=1500){ try{ const s=window.speechSynthesis as SpeechSynthesis; if(!s) return; let e=0; while(s.getVoices().length===0 && e<timeout){ await new Promise(r=>setTimeout(r,100)); e+=100; } }catch{} }
  private async say(text:string){ try{ const s=window.speechSynthesis as SpeechSynthesis; if(!s) return; s.cancel(); await this.waitVoices(); await new Promise<void>(resolve=>{ const u=new SpeechSynthesisUtterance(text); u.lang='es-MX'; u.rate=1; u.pitch=1; u.onend=()=>resolve(); s.speak(u); }); }catch{} }
  private async saySeq(...lines:string[]){ for(const l of lines) await this.say(l); }
}
