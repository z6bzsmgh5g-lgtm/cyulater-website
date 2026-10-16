import { Component, HostListener, inject, signal, viewChild } from '@angular/core';
import { RevealDirective } from './shared/reveal.directive';
import { IconComponent } from './shared/icon.component';
import { LangSwitcherComponent } from './lang-switcher/lang-switcher.component';
import { ContactFormComponent } from './contact/contact-form.component';
import { PipelineComponent } from './pipeline/pipeline.component';
import { ApiDemoComponent } from './api-demo/api-demo.component';
import { ScopeWizardComponent } from './wizard/scope-wizard.component';
import { CommandPaletteComponent } from './command-palette/command-palette.component';
import { FlowStudioComponent } from './flow-studio/flow-studio.component';
import { I18nService } from './i18n/i18n.service';
import { ThemeService } from './core/theme.service';
import { InquiryService } from './core/inquiry.service';

export const SECTION_IDS = ['start', 'leistungen', 'demo', 'flow-studio', 'vorgehen', 'arbeitsweise', 'technologien', 'projekt-check', 'faq', 'kontakt'] as const;

@Component({
  selector: 'app-root',
  imports: [RevealDirective, IconComponent, LangSwitcherComponent, ContactFormComponent, PipelineComponent, ApiDemoComponent, ScopeWizardComponent, CommandPaletteComponent, FlowStudioComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly i18n = inject(I18nService);
  readonly theme = inject(ThemeService);
  readonly email = inject(InquiryService).email;
  readonly year = new Date().getFullYear();
  readonly scrolled = signal(false);
  readonly menuOpen = signal(false);
  readonly activeSection = signal<string>('start');
  readonly openFaq = signal<number | null>(0);
  readonly openExample = signal<number | null>(null);
  readonly palette = viewChild.required(CommandPaletteComponent);

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
  onResize(): void { if (window.innerWidth > 1100) this.menuOpen.set(false); }

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
  toggleExample(i: number): void { this.openExample.update(v => (v === i ? null : i)); }
}
