# goey-toast-angular

Angular-native gooey toast notifications inspired by `goey-toast`.

## Status

- ✅ Buildable Angular library (`ng-packagr`)
- ✅ Unit tests (Vitest + coverage)
- ✅ CI workflow (test + build)
- ✅ npm-ready package metadata
- ✅ Example app snippets in `examples/`

## Install

```bash
npm install goey-toast-angular
```

## Quick start

```ts
import { Component, inject } from '@angular/core';
import { GoeyToasterComponent, GoeyToastService } from 'goey-toast-angular';

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

## API

### `GoeyToastService`

- `show(title, options?)`
- `success(title, options?)`
- `error(title, options?)`
- `warning(title, options?)`
- `info(title, options?)`
- `loading(title, options?)`
- `dismiss(id?)`
- `update(id, patch)`
- `setDefaults({ duration, spring, bounce, ... })`
- `promise(promise, { loading, success, error }, options?)`

### `GoeyToasterComponent`

```html
<goey-toaster position="bottom-right"></goey-toaster>
```

`position` supports:

- `top-left`
- `top-center`
- `top-right`
- `bottom-left`
- `bottom-center`
- `bottom-right`

## Promise toast example

```ts
this.toast.promise(apiCall(), {
  loading: 'Saving...',
  success: () => 'Saved successfully',
  error: (e) => `Failed: ${e?.message ?? 'Unknown error'}`,
});
```

## Development

```bash
npm install
npm test
npm run build
```

## Release flow (automated)

This repo uses:

- `release-please.yml` to open/update a release PR with version + changelog
- `publish.yml` to publish to npm when a GitHub Release is published

Typical flow:

1. Merge feature/fix PRs into `main`
2. Release Please updates/opens the release PR
3. Squash-merge the release PR
4. GitHub Release is created
5. npm publish runs automatically via Trusted Publishing (OIDC)

## Live examples

- Example source: `examples/standalone-app/`
- Quick playground base (StackBlitz): <https://stackblitz.com/edit/angular-standalone-template>

## Publishing to npm

1. Login:

```bash
npm login
```

2. Optional dry run:

```bash
npm pack --dry-run
```

3. Publish:

```bash
npm publish --access public
```

If the unscoped name is taken later, use a scoped package name like `@malachibazar/goey-toast-angular`.

## License

MIT
