import { TestBed } from '@angular/core/testing';
import { ProblemaComponent } from './problema';

describe('ProblemaComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({ imports: [ProblemaComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ProblemaComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
