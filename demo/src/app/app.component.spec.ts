import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the demo heading', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.hero-title')?.textContent).toContain('goey-toast-angular');
  });

  it('should credit goey-toast as inspiration', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const inspiration = compiled.querySelector('a.inspiration-link');

    expect(inspiration?.getAttribute('href')).toBe('https://github.com/anl331/goey-toast');
  });

  it('should not render the legacy mascot image', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const usesLegacyMascot = Array.from(compiled.querySelectorAll('img')).some((image) =>
      image.getAttribute('src')?.includes('mascot.png')
    );

    expect(usesLegacyMascot).toBeFalse();
  });

  it('should render the builder fire button', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.fire-btn')?.textContent).toContain('Fire Toast');
  });
});
