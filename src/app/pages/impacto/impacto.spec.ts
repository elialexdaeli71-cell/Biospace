import { TestBed } from '@angular/core/testing';
import { ImpactoComponent } from './impacto';

describe('ImpactoComponent (content-only)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImpactoComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ImpactoComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
