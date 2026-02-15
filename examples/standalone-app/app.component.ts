import { Component, inject } from '@angular/core';
import { GoeyToasterComponent, GoeyToastService } from 'goey-toast-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GoeyToasterComponent],
  template: `
    <goey-toaster position="bottom-right" />
    <main style="padding: 24px; display: grid; gap: 12px; max-width: 580px; margin: 0 auto;">
      <h1>goey-toast-angular demo</h1>
      <button (click)="basic()">Basic toast</button>
      <button (click)="ok()">Success toast</button>
      <button (click)="fail()">Error toast</button>
      <button (click)="promiseDemo()">Promise toast</button>
    </main>
  `,
})
export class AppComponent {
  private readonly toast = inject(GoeyToastService);

  basic() {
    this.toast.show('Hello from goey-toast-angular', { description: 'Default toast type' });
  }

  ok() {
    this.toast.success('Saved', { description: 'Your data has been synced.' });
  }

  fail() {
    this.toast.error('Upload failed', {
      description: 'Network timeout. Try again.',
      action: { label: 'Retry', onClick: () => this.ok(), successLabel: 'Done' },
    });
  }

  async promiseDemo() {
    await this.toast.promise(new Promise((resolve) => setTimeout(resolve, 1200)), {
      loading: 'Saving...',
      success: 'Saved successfully',
      error: 'Failed',
    });
  }
}
