import { Component, input } from '@angular/core';
import { ServiceIcon } from '../i18n/translations';

const PATHS: Record<ServiceIcon, string[]> = {
  ai: ['M9 3h6', 'M12 3v3', 'M5 8h14v10H5z', 'M9 12h.01', 'M15 12h.01', 'M9.5 15h5', 'M2 12h3', 'M19 12h3'],
  code: ['M8 7l-5 5 5 5', 'M16 7l5 5-5 5', 'M14 4l-4 16'],
  api: ['M7 7h4v4H7z', 'M13 13h4v4h-4z', 'M11 9h4v4', 'M3 9h4', 'M17 15h4'],
  data: ['M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z', 'M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'],
  etl: ['M3 6h6v4H3z', 'M15 14h6v4h-6z', 'M9 8h4a2 2 0 0 1 2 2v4', 'M13 12l2 2 2-2'],
  jira: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M15 16.5l1.5 1.5 3-3'],
};

/** Minimal line icon set (stroke-based SVG). */
@Component({
  selector: 'app-icon',
  template: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    @for (d of paths(); track $index) { <path [attr.d]="d" /> }
  </svg>`,
  styles: `:host{display:inline-flex}`,
})
export class IconComponent {
  readonly name = input.required<ServiceIcon>();
  paths(): string[] { return PATHS[this.name()] ?? []; }
}
