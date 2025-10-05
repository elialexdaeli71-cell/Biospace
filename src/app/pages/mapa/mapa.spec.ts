import { TestBed } from '@angular/core/testing';
import { MapaComponent } from './mapa';

describe('MapaComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({ imports: [MapaComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MapaComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
