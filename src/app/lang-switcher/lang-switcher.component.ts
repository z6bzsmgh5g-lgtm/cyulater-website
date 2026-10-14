import { Component, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-lang-switcher',
  template: `
    <div class="lang" role="group" [attr.aria-label]="i18n.t().a11y.langSwitch">
      @for (l of i18n.languages; track l) {
        <button type="button" [class.active]="i18n.lang() === l" [attr.aria-pressed]="i18n.lang() === l"
                [attr.lang]="l" [attr.aria-label]="l === 'de' ? 'Deutsch' : 'English'" (click)="i18n.setLang(l)">{{ l.toUpperCase() }}</button>
      }
    </div>`,
})
export class LangSwitcherComponent {
  readonly i18n = inject(I18nService);
}
