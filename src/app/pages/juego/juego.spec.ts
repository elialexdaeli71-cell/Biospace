// juego.spec.ts - Pruebas para el juego de clima espacial en Angular
import { TestBed } from '@angular/core/testing';

describe('Juego - Clima Espacial', () => {
    // Mock de elementos DOM
    let mockKpValue: HTMLElement;
    let mockKpFill: HTMLElement;
    let mockKpStatus: HTMLElement;

    beforeEach(() => {
        // Configurar mocks básicos del DOM
        mockKpValue = document.createElement('div');
        mockKpValue.id = 'kpValue';
        
        mockKpFill = document.createElement('div');
        mockKpFill.id = 'kpFill';
        
        mockKpStatus = document.createElement('div');
        mockKpStatus.id = 'kpStatus';

        // Agregar al documento
        document.body.appendChild(mockKpValue);
        document.body.appendChild(mockKpFill);
        document.body.appendChild(mockKpStatus);
    });

    afterEach(() => {
        // Limpiar después de cada test
        document.body.innerHTML = '';
    });

    describe('Funciones básicas', () => {
        it('clamp debería limitar números dentro del rango', () => {
            expect(clamp(5, 0, 10)).toBe(5);
            expect(clamp(-1, 0, 10)).toBe(0);
            expect(clamp(11, 0, 10)).toBe(10);
        });

        it('smoothstep debería aplicar easing correctamente', () => {
            expect(smoothstep(0)).toBe(0);
            expect(smoothstep(1)).toBe(1);
            expect(smoothstep(0.5)).toBe(0.5);
        });

        it('setKP debería actualizar el valor Kp correctamente', () => {
            // Usar window en lugar de global para Angular
            (window as any).kpValue = mockKpValue;
            (window as any).kpFill = mockKpFill;
            
            setKP(5);
            expect(kp).toBe(5);
            expect(mockKpValue.textContent).toBe('5');
            expect(mockKpFill.style.width).toBe('55.55555555555556%');
        });

        it('kClass debería clasificar correctamente los niveles Kp', () => {
            const low = kClass(3);
            expect(low.key).toBe('low');
            expect(low.statusClass).toBe('status--low');

            const mid = kClass(6);
            expect(mid.key).toBe('mid');
            expect(mid.statusClass).toBe('status--mid');

            const high = kClass(9);
            expect(high.key).toBe('high');
            expect(high.statusClass).toBe('status--high');
        });
    });

    describe('Utilidades', () => {
        it('pickRandom debería seleccionar elementos aleatorios', () => {
            const array = ['a', 'b', 'c', 'd', 'e'];
            const result = pickRandom(array, 3);
            
            expect(result.length).toBe(3);
            result.forEach(item => {
                expect(array).toContain(item);
            });
        });

        it('updateIncomingStatus debería actualizar el estado correctamente', () => {
            (window as any).kpStatus = mockKpStatus;
            
            // Test para Kp = 0
            kp = 0;
            updateIncomingStatus();
            expect(mockKpStatus.className).toContain('status--idle');
            expect(mockKpStatus.innerHTML).toContain('Se aproxima: —');
            
            // Test para Kp bajo
            kp = 3;
            updateIncomingStatus();
            expect(mockKpStatus.className).toContain('status--low');
        });
    });

    describe('Sistema de partículas', () => {
        it('clearParticles debería limpiar todas las partículas', () => {
            const mockElement = document.createElement('div');
            particles = [
                { 
                    el: mockElement, 
                    sx: 0, 
                    sy: 0, 
                    ex: 100, 
                    ey: 100, 
                    sg: 0, 
                    done: false 
                }
            ];
            
            // Mock de remove method para Angular
            spyOn(mockElement, 'remove');
            
            clearParticles();
            expect(particles.length).toBe(0);
            expect(mockElement.remove).toHaveBeenCalled();
        });
    });
});

// Funciones auxiliares para testing
function clamp(n: number, min: number, max: number): number { 
    return Math.max(min, Math.min(max, n)); 
}

function smoothstep(u: number): number { 
    return u * u * (3 - 2 * u); 
}

function setKP(v: number): void {
    kp = clamp(v, 0, KP_MAX);
    if ((window as any).kpValue) {
        (window as any).kpValue.textContent = Math.round(kp).toString();
    }
    if ((window as any).kpFill) {
        (window as any).kpFill.style.width = `${(kp / 9) * 100}%`;
    }
}

function kClass(k: number): any {
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

function pickRandom(arr: string[], n: number): string[] {
    const copy: string[] = [...arr];
    const out: string[] = [];
    for (let i = 0; i < n && copy.length; i++) {
        const idx: number = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
    }
    return out;
}

function updateIncomingStatus(): void {
    const k: number = Math.round(kp);
    const statusElement = (window as any).kpStatus;
    if (!statusElement) return;

    if (k === 0) {
        statusElement.className = 'kp__status status--idle';
        statusElement.innerHTML = 'Se aproxima: —';
        return;
    }
    const cls = kClass(k);
    statusElement.className = `kp__status ${cls.statusClass}`;
    statusElement.innerHTML = cls.titleIncoming;
}

function clearParticles(): void {
    particles.forEach(p => {
        if (p.el && typeof p.el.remove === 'function') {
            p.el.remove();
        }
    });
    particles.length = 0;
}

// Variables globales para testing
let kp: number = 0;
const KP_MAX: number = 9;
let particles: any[] = [];