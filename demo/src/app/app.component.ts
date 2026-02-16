import { Component, inject } from '@angular/core';
import { GoeyToasterComponent, GoeyToastService } from 'goey-toast-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GoeyToasterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly toast = inject(GoeyToastService);

  basic() {
    this.toast.show('Hello from goey-toast-angular', {
      description: 'Default toast with gooey styling.',
    });
  }

  success() {
    this.toast.success('Saved', {
      description: 'Your changes have been synced.',
    });
  }

  error() {
    this.toast.error('Upload failed', {
      description: 'Network timeout. Please retry.',
      action: {
        label: 'Retry',
        onClick: () => this.success(),
        successLabel: 'Done!',
      },
    });
  }

  warning() {
    this.toast.warning('Careful there', {
      description: 'This action cannot be undone.',
      duration: 5000,
    });
  }

  info() {
    this.toast.info('Heads up', {
      description: 'Maintenance starts at 10:00 UTC.',
    });
  }

  async promiseDemo() {
    await this.toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: 'Saving...',
        success: 'Saved successfully',
        error: 'Failed to save',
      }
    );
  }
}
