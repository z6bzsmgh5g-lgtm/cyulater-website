import { TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  it.each(['ai', 'code', 'api', 'data', 'etl', 'jira'] as const)('renders paths for %s', async name => {
    const f = TestBed.createComponent(IconComponent);
    f.componentRef.setInput('name', name);
    await f.whenStable();
    const svg = (f.nativeElement as HTMLElement).querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });
});
