import { Component, OnInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Diet = 'alta' | 'mixta' | 'baja' | 'veg' | 'vegan';
type Car = 'ice' | 'hibrido' | 'ev';

interface State {
  carType: Car;
  carKmWeek: number;
  transitKmWeek: number;
  flightsShortYr: number;
  flightsLongYr: number;
  elecKwhMonth: number;
  gasKwhMonth: number;
  solarPct: number; // 0-100
  diet: Diet;
  wasteKgWeek: number;
  recycle: boolean;
  clothesYr: number;
  electronicsYr: number;
}

@Component({
  selector: 'app-impacto',
  standalone: true,
  templateUrl: './impacto.html',
  styleUrls: ['./impacto.scss'],
  imports: [CommonModule, FormsModule],
})
export class ImpactoComponent implements OnInit {

  // ===== Estado base =====
  state = signal<State>({
    carType: 'ice',
    carKmWeek: 120,
    transitKmWeek: 20,
    flightsShortYr: 1,
    flightsLongYr: 0,
    elecKwhMonth: 180,
    gasKwhMonth: 300,
    solarPct: 0,
    diet: 'mixta',
    wasteKgWeek: 6,
    recycle: true,
    clothesYr: 8,
    electronicsYr: 0.3,
  });

  // ===== Resultados =====
  totalTons = signal(0);
  breakdown = signal<{ name: string; value: number; color: string }[]>([]);
  tips = signal<string[]>([]);
  targetTons = 2.0;

  ngOnInit(): void {
    const raw = localStorage.getItem('impacto_state');
    if (raw) {
      try { this.state.set({ ...this.state(), ...JSON.parse(raw) }); } catch {}
    }
    effect(() => {
      const s = this.state();
      this.compute();
      localStorage.setItem('impacto_state', JSON.stringify(s));
    });
  }

  /** Cálculo (aprox) de huella anual en tCO2e */
  private compute() {
    const s = this.state();

    // Factores (kg CO2e / km)
    const EF_CAR: Record<Car, number> = { ice: 0.192, hibrido: 0.120, ev: 0.050 };
    const EF_TRANSIT = 0.08;
    const EF_FLIGHT_SHORT = 0.15;
    const EF_FLIGHT_LONG = 0.10;

    const KM_SHORT = 1000;
    const KM_LONG = 6000;

    // Energía (kg CO2e / kWh)
    const EF_ELEC = 0.35;
    const EF_GAS = 0.204;

    // Dieta (t / año)
    const EF_DIET: Record<Diet, number> = {
      alta: 3.3, mixta: 2.3, baja: 1.6, veg: 1.3, vegan: 1.0,
    };

    // Consumo / residuos
    const EF_CLOTH = 0.025;        // t por prenda
    const EF_ELEC_DEVICE = 0.2;    // t por equipo
    const EF_WASTE_KG = s.recycle ? 0.0004 : 0.0007; // t por kg

    // Transporte
    const car = (s.carKmWeek * 52 * EF_CAR[s.carType]) / 1000;
    const transit = (s.transitKmWeek * 52 * EF_TRANSIT) / 1000;
    const flights =
      (s.flightsShortYr * KM_SHORT * EF_FLIGHT_SHORT +
       s.flightsLongYr * KM_LONG * EF_FLIGHT_LONG) / 1000;

    // Hogar
    const elecYearKwh = s.elecKwhMonth * 12;
    const solarAdj = Math.max(0, 1 - s.solarPct / 100);
    const homeElec = (elecYearKwh * EF_ELEC * solarAdj) / 1000;
    const homeGas = (s.gasKwhMonth * 12 * EF_GAS) / 1000;

    // Dieta
    const diet = EF_DIET[s.diet];

    // Consumo & residuos
    const clothes = s.clothesYr * EF_CLOTH;
    const electronics = s.electronicsYr * EF_ELEC_DEVICE;
    const waste = (s.wasteKgWeek * 52) * EF_WASTE_KG;

    const breakdown = [
      { name: 'Transporte (auto)',      value: +car,                 color: '#ff6b8b' },
      { name: 'Transporte (público)',   value: +transit,             color: '#9cc2ff' },
      { name: 'Vuelos',                 value: +flights,             color: '#ffd166' },
      { name: 'Electricidad',           value: +homeElec,            color: '#a3e4d7' },
      { name: 'Gas',                    value: +homeGas,             color: '#80cbc4' },
      { name: 'Dieta',                  value: +diet,                color: '#f48fb1' },
      { name: 'Consumo',                value: +(clothes + electronics), color: '#b39ddb' },
      { name: 'Residuos',               value: +waste,               color: '#cfd8dc' },
    ];

    this.breakdown.set(breakdown);
    this.totalTons.set(
      Number(breakdown.reduce((a, b) => a + b.value, 0).toFixed(2))
    );
    this.tips.set(this.suggest(breakdown));
  }

  private suggest(bd: { name: string; value: number }[]): string[] {
    const tips: string[] = [];
    const by = (n: string) => bd.find(x => x.name.startsWith(n))?.value ?? 0;

    if (by('Vuelos') > 1.2) tips.push('Reduce 1 vuelo largo o 2 cortos al año; impacto grande inmediato.');
    if (by('Transporte (auto)') > 1.5) tips.push('Comparte viajes, combina recados y considera híbrido/EV.');
    if (by('Electricidad') > 0.9) tips.push('Cámbiate a tarifa renovable o instala solar.');
    if (by('Gas') > 0.8) tips.push('Mejora aislamiento y considera bomba de calor.');
    if (by('Dieta') > 2.0) tips.push('2–3 días/semana sin carne roja o porciones menores.');
    if (by('Consumo') > 0.5) tips.push('Compra ropa durable y repara antes de reemplazar.');
    if (by('Residuos') > 0.3) tips.push('Separa orgánicos para compost y recicla vidrio/metal/papel.');
    if (!tips.length) tips.push('¡Vas muy bien! Mantén hábitos y compártelos.');

    return tips.slice(0, 6);
  }

  /** % respecto a la meta (para el gauge) */
  pctOfTarget(): number {
    const v = this.totalTons();
    return Math.min(100, Math.round((v / this.targetTons) * 100));
  }

  /** % de ancho para cada barra (sin usar Math en el template) */
  widthPct(val: number): number {
    const t = this.totalTons();
    const denom = t > 0.1 ? t : 0.1;
    const pct = (val / denom) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  set<K extends keyof State>(key: K, val: State[K]) {
    this.state.set({ ...this.state(), [key]: val });
  }
}
