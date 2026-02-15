# goey-toast-angular (starter)

An Angular-native toast system inspired by `goey-toast` (React).

## Features in this starter

- Toast types: `default`, `success`, `error`, `warning`, `info`
- Global `GoeyToastService`
- `GoeyToasterComponent` host with six positions
- Auto-dismiss timers
- Pre-dismiss collapse animation
- Action button support
- Promise helper (`promise`) for loading -> success/error
- Simple blob-ish styling and spring-like transitions

## Quick start

### Install (once published)

```bash
npm install goey-toast-angular
```

### Use in app

1. Add `<goey-toaster />` once near your app root (e.g., `app.component.html`).
2. Inject `GoeyToastService` where needed.

```ts
import { Component, inject } from '@angular/core';
import { GoeyToasterComponent, GoeyToastService } from './goey-toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GoeyToasterComponent],
  template: `
    <goey-toaster position="bottom-right" />
    <button (click)="save()">Save</button>
  `,
})
export class AppComponent {
  private toast = inject(GoeyToastService);

  save() {
    this.toast.success('Saved!', { description: 'Your changes are synced.' });
  }
}
```

## Promise example

```ts
this.toast.promise(apiCall(), {
  loading: 'Saving...',
  success: () => 'Saved successfully',
  error: (e) => `Failed: ${e?.message ?? 'Unknown error'}`,
});
```

## Notes

This is a practical Angular port starter, not a pixel-perfect clone of the React package internals.
If you want, I can continue by packaging this as a publishable Angular library (`ng-packagr`) and add tests + Storybook.
