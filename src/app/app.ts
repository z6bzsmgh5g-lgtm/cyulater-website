import { Component, HostListener, inject, signal } from '@angular/core';
import { RevealDirective } from './shared/reveal.directive';
import { ParticlesComponent } from './shared/particles.component';
import { IconComponent } from './shared/icon.component';
import { LangSwitcherComponent } from './lang-switcher/lang-switcher.component';
import { ContactFormComponent, CONTACT_EMAIL } from './contact/contact-form.component';
import { I18nService } from './i18n/i18n.service';

export const SECTION_IDS = ['start', 'leistungen', 'vorgehen', 'arbeitsweise', 'technologien', 'faq', 'kontakt'] as const;

@Component({
  selector: 'app-root',
  imports: [RevealDirective, ParticlesComponent, IconComponent, LangSwitcherComponent, ContactFormComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly i18n = inject(I18nService);
  readonly email = CONTACT_EMAIL;
  readonly year = new Date().getFullYear();
  readonly scrolled = signal(false);
  readonly menuOpen = signal(false);
  readonly activeSection = signal<string>('start');
  readonly openFaq = signal<number | null>(0);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 20);
    let current = 'start';
    for (const s of SECTION_IDS) {
      const el = document.getElementById(s);
      if (el && el.getBoundingClientRect().top <= 120) current = s;
    }
    this.activeSection.set(current);
  }

  @HostListener('window:resize')
  onResize(): void { if (window.innerWidth > 960) this.menuOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.menuOpen.set(false); }

  scrollTo(id: string, ev?: Event): void {
    ev?.preventDefault();
    this.menuOpen.set(false);
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = document.getElementById(id);
    el?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth' });
    if (id === 'main') el?.focus();
  }

  toggleFaq(i: number): void { this.openFaq.update(v => (v === i ? null : i)); }
}
