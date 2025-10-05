import { TestBed } from '@angular/core/testing';
import { ImpactoComponent } from './impacto';

describe('ImpactoComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({ imports: [ImpactoComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ImpactoComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
