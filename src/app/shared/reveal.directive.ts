import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';

/** Adds `is-visible` when the element scrolls into view. */
@Directive({ selector: '[appReveal]', host: { class: 'reveal' } })
export class RevealDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  readonly revealDelay = input(0);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const node = this.el.nativeElement as HTMLElement;
    node.style.setProperty('--reveal-delay', `${this.revealDelay()}ms`);
    if (typeof IntersectionObserver === 'undefined') { node.classList.add('is-visible'); return; }
    this.observer = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { node.classList.add('is-visible'); this.observer?.disconnect(); }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    this.observer.observe(node);
  }
  ngOnDestroy(): void { this.observer?.disconnect(); }
}
