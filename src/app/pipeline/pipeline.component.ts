import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';

interface NodeBox { id: string; x: number; y: number; w: number; h: number; kind: 'source' | 'core' | 'target'; }
interface Edge { from: string; to: string; d: string; }

export const SOURCE_IDS = ['erp', 'api', 'files'] as const;
export const TARGET_IDS = ['dwh', 'ai', 'jira'] as const;

/** Interactive ETL / integration diagram: sources → Cyulater → targets. */
@Component({
  selector: 'app-pipeline',
  templateUrl: './pipeline.component.html',
  host: { class: 'pipeline' },
})
export class PipelineComponent {
  readonly i18n = inject(I18nService);
  readonly active = signal<string | null>(null);
  readonly vertical = signal(false);
  readonly reducedMotion = signal(false);

  constructor() {
    const w = typeof window !== 'undefined' ? window : undefined;
    if (w && typeof w.matchMedia === 'function') {
      const mqV = w.matchMedia('(max-width: 639px)');
      const mqR = w.matchMedia('(prefers-reduced-motion: reduce)');
      this.vertical.set(mqV.matches);
      this.reducedMotion.set(mqR.matches);
      const onV = (e: MediaQueryListEvent) => this.vertical.set(e.matches);
      const onR = (e: MediaQueryListEvent) => this.reducedMotion.set(e.matches);
      mqV.addEventListener?.('change', onV);
      mqR.addEventListener?.('change', onR);
      inject(DestroyRef).onDestroy(() => { mqV.removeEventListener?.('change', onV); mqR.removeEventListener?.('change', onR); });
    }
  }

  readonly viewBox = computed(() => (this.vertical() ? '0 0 360 470' : '0 0 600 360'));

  readonly boxes = computed<NodeBox[]>(() => {
    if (this.vertical()) {
      const w = 104, h = 44;
      return [
        ...SOURCE_IDS.map((id, i) => ({ id, x: 8 + i * 124, y: 30, w, h, kind: 'source' as const })),
        { id: 'core', x: 100, y: 206, w: 160, h: 58, kind: 'core' as const },
        ...TARGET_IDS.map((id, i) => ({ id, x: 8 + i * 124, y: 396, w, h, kind: 'target' as const })),
      ];
    }
    const w = 128, h = 46;
    return [
      ...SOURCE_IDS.map((id, i) => ({ id, x: 6, y: 40 + i * 116, w, h, kind: 'source' as const })),
      { id: 'core', x: 220, y: 148, w: 160, h: 64, kind: 'core' as const },
      ...TARGET_IDS.map((id, i) => ({ id, x: 466, y: 40 + i * 116, w, h, kind: 'target' as const })),
    ];
  });

  readonly edges = computed<Edge[]>(() => {
    const b = Object.fromEntries(this.boxes().map(n => [n.id, n]));
    const core = b['core'];
    const v = this.vertical();
    const curve = (x1: number, y1: number, x2: number, y2: number) => v
      ? `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`
      : `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
    const ins = SOURCE_IDS.map(id => {
      const s = b[id];
      return v ? { from: id, to: 'core', d: curve(s.x + s.w / 2, s.y + s.h, core.x + core.w / 2, core.y) }
               : { from: id, to: 'core', d: curve(s.x + s.w, s.y + s.h / 2, core.x, core.y + core.h / 2) };
    });
    const outs = TARGET_IDS.map(id => {
      const t = b[id];
      return v ? { from: 'core', to: id, d: curve(core.x + core.w / 2, core.y + core.h, t.x + t.w / 2, t.y) }
               : { from: 'core', to: id, d: curve(core.x + core.w, core.y + core.h / 2, t.x, t.y + t.h / 2) };
    });
    return [...ins, ...outs];
  });

  readonly columnTitles = computed(() => {
    const t = this.i18n.t().pipeline;
    return this.vertical()
      ? [{ x: 180, y: 18, text: t.sourcesTitle }, { x: 180, y: 194, text: t.coreTitle }, { x: 180, y: 384, text: t.targetsTitle }]
      : [{ x: 70, y: 24, text: t.sourcesTitle }, { x: 300, y: 136, text: t.coreTitle }, { x: 530, y: 24, text: t.targetsTitle }];
  });

  label(id: string): string { return this.i18n.t().pipeline.nodes.find(n => n.id === id)?.label ?? id; }

  readonly caption = computed(() => {
    const id = this.active();
    const n = id ? this.i18n.t().pipeline.nodes.find(x => x.id === id) : null;
    return n ? { title: n.label, text: n.desc } : null;
  });

  isLit(e: Edge): boolean {
    const a = this.active();
    return !a || a === 'core' || e.from === a || e.to === a;
  }

  /** Node pinned via click/keyboard; hover only previews when nothing is pinned. */
  readonly pinned = signal<string | null>(null);

  select(id: string): void {
    const next = this.pinned() === id ? null : id;
    this.pinned.set(next);
    this.active.set(next);
  }

  preview(id: string | null): void { if (!this.pinned()) this.active.set(id); }

  onKey(ev: KeyboardEvent, id: string): void {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.select(id); }
  }
}
