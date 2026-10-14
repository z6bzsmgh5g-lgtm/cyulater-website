import { AfterViewInit, Component, ElementRef, OnDestroy, viewChild } from '@angular/core';

interface P { x: number; y: number; vx: number; vy: number; r: number; }

/** Subtle animated network in brand colours. Static when reduced motion is preferred. */
@Component({
  selector: 'app-particles',
  template: `<canvas #c aria-hidden="true"></canvas>`,
  styles: `:host{position:absolute;inset:0;display:block;pointer-events:none}canvas{width:100%;height:100%;display:block}`,
})
export class ParticlesComponent implements AfterViewInit, OnDestroy {
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('c');
  private ctx: CanvasRenderingContext2D | null = null;
  private raf = 0;
  ps: P[] = [];
  private onResize = () => this.resize();

  ngAfterViewInit(): void {
    const c = this.canvas().nativeElement;
    try { this.ctx = typeof c.getContext === 'function' ? c.getContext('2d') : null; } catch { this.ctx = null; }
    if (!this.ctx) return;
    this.resize();
    window.addEventListener('resize', this.onResize, { passive: true });
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) this.draw(false); else this.loop();
  }

  private resize(): void {
    const c = this.canvas().nativeElement;
    if (!this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.offsetWidth * dpr; c.height = c.offsetHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(60, Math.floor((c.offsetWidth * c.offsetHeight) / 24000));
    this.ps = Array.from({ length: n }, () => ({
      x: Math.random() * c.offsetWidth, y: Math.random() * c.offsetHeight,
      vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18, r: Math.random() * 1.2 + .5,
    }));
  }

  private loop = () => { this.draw(true); this.raf = requestAnimationFrame(this.loop); };

  private draw(move: boolean): void {
    const ctx = this.ctx; if (!ctx) return;
    const c = this.canvas().nativeElement, w = c.offsetWidth, h = c.offsetHeight;
    ctx.clearRect(0, 0, w, h);
    for (const p of this.ps) {
      if (move) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      ctx.fillStyle = 'rgba(190,140,240,.55)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < this.ps.length; i++) for (let j = i + 1; j < this.ps.length; j++) {
      const a = this.ps[i], b = this.ps[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 140) {
        ctx.strokeStyle = `rgba(160,90,210,${(1 - d / 140) * .18})`;
        ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
  }
}
