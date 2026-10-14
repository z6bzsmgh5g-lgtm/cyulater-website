import { TestBed } from '@angular/core/testing';
import { ParticlesComponent } from './particles.component';

describe('ParticlesComponent', () => {
  it('renders a decorative canvas and degrades gracefully without 2D context', async () => {
    const f = TestBed.createComponent(ParticlesComponent);
    await f.whenStable();
    const c = (f.nativeElement as HTMLElement).querySelector('canvas')!;
    expect(c.getAttribute('aria-hidden')).toBe('true');
    expect(f.componentInstance.ps.length).toBe(0);
    expect(() => f.destroy()).not.toThrow();
  });
});
