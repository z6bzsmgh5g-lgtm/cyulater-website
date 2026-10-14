import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RevealDirective } from './reveal.directive';

@Component({ imports: [RevealDirective], template: `<div appReveal [revealDelay]="150">x</div>` })
class Host {}

describe('RevealDirective', () => {
  let callback: IntersectionObserverCallback;
  const observe = vi.fn(), disconnect = vi.fn();
  const original = globalThis.IntersectionObserver;

  afterEach(() => { globalThis.IntersectionObserver = original; vi.clearAllMocks(); });

  function mockIO() {
    globalThis.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) { callback = cb; }
      observe = observe; disconnect = disconnect; unobserve() {} takeRecords() { return []; }
    } as unknown as typeof IntersectionObserver;
  }

  it('adds reveal class and delay, and becomes visible on intersection', async () => {
    mockIO();
    const f = TestBed.createComponent(Host);
    await f.whenStable();
    const div = (f.nativeElement as HTMLElement).querySelector('div')!;
    expect(div.classList).toContain('reveal');
    expect(div.classList).not.toContain('is-visible');
    expect(div.style.getPropertyValue('--reveal-delay')).toBe('150ms');
    expect(observe).toHaveBeenCalledWith(div);
    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(div.classList).toContain('is-visible');
    expect(disconnect).toHaveBeenCalled();
  });

  it('stays hidden while not intersecting', async () => {
    mockIO();
    const f = TestBed.createComponent(Host);
    await f.whenStable();
    callback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect((f.nativeElement as HTMLElement).querySelector('div')!.classList).not.toContain('is-visible');
  });

  it('falls back to visible when IntersectionObserver is unavailable', async () => {
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = undefined;
    const f = TestBed.createComponent(Host);
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).querySelector('div')!.classList).toContain('is-visible');
  });

  it('disconnects on destroy', async () => {
    mockIO();
    const f = TestBed.createComponent(Host);
    await f.whenStable();
    f.destroy();
    expect(disconnect).toHaveBeenCalled();
  });
});
