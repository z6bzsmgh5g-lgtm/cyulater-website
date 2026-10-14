import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { DEMO_CALLS, DemoCall, tokenizeJson } from './api-demo.data';

/** Interactive mock API console – shows clean request/response design. */
@Component({
  selector: 'app-api-demo',
  templateUrl: './api-demo.component.html',
})
export class ApiDemoComponent {
  readonly i18n = inject(I18nService);
  readonly calls = DEMO_CALLS;
  readonly selectedId = signal<DemoCall['id']>('orders');
  readonly state = signal<'idle' | 'loading' | 'done'>('idle');
  /** Simulated network delay (ms); set to 0 in tests. */
  delayMs = 450;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() { inject(DestroyRef).onDestroy(() => clearTimeout(this.timer)); }

  readonly call = computed(() => this.calls.find(c => c.id === this.selectedId())!);
  readonly requestTokens = computed(() => (this.call().body ? tokenizeJson(this.call().body) : []));
  readonly responseTokens = computed(() => tokenizeJson(this.call().response));
  readonly endpointInfo = computed(() => this.i18n.t().demo.endpoints.find(e => e.id === this.selectedId())!);

  select(id: DemoCall['id']): void {
    if (id === this.selectedId()) return;
    clearTimeout(this.timer);
    this.selectedId.set(id);
    this.state.set('idle');
  }

  onTabKey(ev: KeyboardEvent, index: number): void {
    const delta = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    ev.preventDefault();
    const next = this.calls[(index + delta + this.calls.length) % this.calls.length];
    this.select(next.id);
    (ev.currentTarget as HTMLElement).parentElement?.querySelector<HTMLElement>(`#demo-tab-${next.id}`)?.focus();
  }

  send(): void {
    if (this.state() === 'loading') return;
    this.state.set('loading');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.state.set('done'), this.delayMs);
  }

  reset(): void { clearTimeout(this.timer); this.state.set('idle'); }
}
