import { ChangeDetectionStrategy, Component, WritableSignal, computed, inject, signal } from '@angular/core';
import {
  GoeyToasterComponent,
  GoeyToastOptions,
  GoeyToastRadius,
  GoeyToastPosition,
  GoeyToastService,
  GoeyToastType,
  GoeyToastTypeColors,
} from 'goey-toast-angular';

type DemoToastType = Exclude<GoeyToastType, 'loading'>;

const POSITIONS: GoeyToastPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const TOAST_TYPES: DemoToastType[] = ['default', 'success', 'error', 'warning', 'info'];
const TONE_TYPES: GoeyToastType[] = ['default', 'success', 'error', 'warning', 'info', 'loading'];
const DEFAULT_FILL_COLOR = '#222B45';
const DEFAULT_BORDER_COLOR = '#3366FF';
const DEFAULT_BORDER_WIDTH = 1;
const DEFAULT_DURATION = 4000;
const DEFAULT_SPRING = true;
const DEFAULT_BOUNCE = 0.4;
const DEFAULT_TYPE_COLORS: Record<GoeyToastType, string> = {
  default: '#8F9BB3',
  success: '#00D68F',
  error: '#FF3D71',
  warning: '#FFAA00',
  info: '#0095FF',
  loading: '#8F9BB3',
};
const DEFAULT_RADIUS: Required<GoeyToastRadius> = {
  pill: 12,
  body: 8,
  action: 6,
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GoeyToasterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly toast = inject(GoeyToastService);

  readonly positions = POSITIONS;
  readonly toastTypes = TOAST_TYPES;
  readonly toneTypes = TONE_TYPES;

  readonly builderPosition = signal<GoeyToastPosition>('top-left');
  readonly builderType = signal<DemoToastType>('success');
  readonly builderTitle = signal('Changes saved');

  readonly builderHasDescription = signal(true);
  readonly builderDescription = signal('Your changes have been saved and synced successfully.');

  readonly builderHasAction = signal(false);
  readonly builderActionLabel = signal('Undo');

  readonly builderFillColor = signal(DEFAULT_FILL_COLOR);
  readonly builderTypeColors = signal<GoeyToastTypeColors>({ ...DEFAULT_TYPE_COLORS });
  readonly builderHasBorder = signal(false);
  readonly builderBorderColor = signal(DEFAULT_BORDER_COLOR);
  readonly builderBorderWidth = signal(DEFAULT_BORDER_WIDTH);
  readonly builderPillRadius = signal(DEFAULT_RADIUS.pill);
  readonly builderBodyRadius = signal(DEFAULT_RADIUS.body);
  readonly builderActionRadius = signal(
    typeof DEFAULT_RADIUS.action === 'number' ? DEFAULT_RADIUS.action : 999
  );

  readonly builderDisplayDuration = signal(DEFAULT_DURATION);
  readonly builderSpring = signal(DEFAULT_SPRING);
  readonly builderBounce = signal(DEFAULT_BOUNCE);

  readonly installCopied = signal(false);
  readonly codeCopied = signal(false);

  readonly generatedCode = computed(() => {
    const lines: string[] = [];

    const type = this.builderType();
    const title = this.builderTitle().trim() || 'Changes saved';
    const fillColor = this.builderFillColor().trim();
    const hasDescription = this.builderHasDescription() && Boolean(this.builderDescription().trim());
    const hasAction = this.builderHasAction() && Boolean(this.builderActionLabel().trim());
    const hasFillColor = Boolean(fillColor);
    const hasBorder = this.builderHasBorder() && Boolean(this.builderBorderColor().trim());
    const hasCustomDuration = this.builderDisplayDuration() !== DEFAULT_DURATION;
    const hasCustomSpring = this.builderSpring() !== DEFAULT_SPRING;
    const hasCustomBounce = this.builderBounce() !== DEFAULT_BOUNCE;
    const customTypeColors = this.customTypeColors();
    const customRadius = this.customRadius();
    const hasCustomTypeColors = Object.keys(customTypeColors).length > 0;
    const hasCustomRadius = Object.keys(customRadius).length > 0;

    lines.push(`<goey-toaster theme="dark" position="${this.builderPosition()}"></goey-toaster>`);
    lines.push('');

    const callName = type === 'default' ? 'toast.show' : `toast.${type}`;
    const hasOptions =
      hasDescription ||
      hasAction ||
      hasFillColor ||
      hasBorder ||
      hasCustomDuration ||
      hasCustomSpring ||
      hasCustomBounce ||
      hasCustomTypeColors ||
      hasCustomRadius;

    if (!hasOptions) {
      lines.push(`${callName}('${escapeSingleQuote(title)}');`);
      return lines.join('\n');
    }

    lines.push(`${callName}('${escapeSingleQuote(title)}', {`);

    if (hasDescription) {
      lines.push(`  description: '${escapeSingleQuote(this.builderDescription().trim())}',`);
    }

    if (hasAction) {
      lines.push('  action: {');
      lines.push(`    label: '${escapeSingleQuote(this.builderActionLabel().trim())}',`);
      lines.push('    onClick: () => {},');
      lines.push("    successLabel: 'Done!',");
      lines.push('  },');
    }

    if (hasFillColor) {
      lines.push(`  fillColor: '${fillColor}',`);
    }

    if (hasBorder) {
      lines.push(`  borderColor: '${this.builderBorderColor()}',`);
      lines.push(`  borderWidth: ${this.builderBorderWidth()},`);
    }

    if (hasCustomTypeColors) {
      lines.push('  typeColors: {');
      for (const toneType of this.toneTypes) {
        const color = customTypeColors[toneType];
        if (!color) {
          continue;
        }
        lines.push(`    ${toneType}: '${color}',`);
      }
      lines.push('  },');
    }

    if (hasCustomRadius) {
      lines.push('  radius: {');
      if (typeof customRadius.pill === 'number') {
        lines.push(`    pill: ${customRadius.pill},`);
      }
      if (typeof customRadius.body === 'number') {
        lines.push(`    body: ${customRadius.body},`);
      }
      if (typeof customRadius.action === 'number') {
        lines.push(`    action: ${customRadius.action},`);
      }
      lines.push('  },');
    }

    if (hasCustomDuration) {
      lines.push('  timing: {');
      lines.push(`    displayDuration: ${this.builderDisplayDuration()},`);
      lines.push('  },');
    }

    if (hasCustomSpring) {
      lines.push('  spring: false,');
    }

    if (hasCustomBounce) {
      lines.push(`  bounce: ${this.builderBounce().toFixed(2)},`);
    }

    lines.push('});');
    return lines.join('\n');
  });

  constructor() {
    this.toast.setDefaults({
      duration: DEFAULT_DURATION,
      spring: DEFAULT_SPRING,
      bounce: DEFAULT_BOUNCE,
      typeColors: { ...DEFAULT_TYPE_COLORS },
      radius: { ...DEFAULT_RADIUS },
    });
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  copyInstallCommand() {
    this.copyText('npm install goey-toast-angular', this.installCopied);
  }

  copyGeneratedCode() {
    this.copyText(this.generatedCode(), this.codeCopied);
  }

  fireBuilderToast() {
    const fillColor = this.builderFillColor().trim();
    const options: GoeyToastOptions = {
      timing: {
        displayDuration: this.builderDisplayDuration(),
      },
      spring: this.builderSpring(),
      bounce: this.builderBounce(),
    };

    if (fillColor) {
      options.fillColor = fillColor;
    }

    if (this.builderHasDescription() && this.builderDescription().trim()) {
      options.description = this.builderDescription().trim();
    }

    if (this.builderHasAction() && this.builderActionLabel().trim()) {
      options.action = {
        label: this.builderActionLabel().trim(),
        onClick: () => undefined,
        successLabel: 'Done!',
      };
    }

    if (this.builderHasBorder()) {
      options.borderColor = this.builderBorderColor();
      options.borderWidth = this.builderBorderWidth();
    }

    const customTypeColors = this.customTypeColors();
    if (Object.keys(customTypeColors).length > 0) {
      options.typeColors = customTypeColors;
    }

    const customRadius = this.customRadius();
    if (Object.keys(customRadius).length > 0) {
      options.radius = customRadius;
    }

    this.showByType(this.builderType(), this.builderTitle().trim() || 'Changes saved', options);
  }

  setBuilderBorderWidth(value: string) {
    this.builderBorderWidth.set(this.parseFiniteOrCurrent(value, this.builderBorderWidth()));
  }

  setBuilderTypeColor(type: GoeyToastType, value: string) {
    this.builderTypeColors.update((colors) => ({
      ...colors,
      [type]: value,
    }));
  }

  builderToneColor(type: GoeyToastType): string {
    return this.builderTypeColors()[type] ?? DEFAULT_TYPE_COLORS[type];
  }

  setBuilderDisplayDuration(value: string) {
    this.builderDisplayDuration.set(this.parseFiniteOrCurrent(value, this.builderDisplayDuration()));
  }

  setBuilderBounce(value: string) {
    this.builderBounce.set(this.parseFiniteOrCurrent(value, this.builderBounce()));
  }

  setBuilderPillRadius(value: string) {
    this.builderPillRadius.set(this.parseFiniteOrCurrent(value, this.builderPillRadius()));
  }

  setBuilderBodyRadius(value: string) {
    this.builderBodyRadius.set(this.parseFiniteOrCurrent(value, this.builderBodyRadius()));
  }

  setBuilderActionRadius(value: string) {
    this.builderActionRadius.set(this.parseFiniteOrCurrent(value, this.builderActionRadius()));
  }

  private parseFiniteOrCurrent(value: string, current: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : current;
  }

  private customTypeColors(): GoeyToastTypeColors {
    const colors = this.builderTypeColors();
    const custom: GoeyToastTypeColors = {};

    for (const type of this.toneTypes) {
      const color = colors[type];
      if (!color) {
        continue;
      }

      if (color.toLowerCase() !== DEFAULT_TYPE_COLORS[type].toLowerCase()) {
        custom[type] = color;
      }
    }

    return custom;
  }

  private customRadius(): GoeyToastRadius {
    const custom: GoeyToastRadius = {};

    if (this.builderPillRadius() !== DEFAULT_RADIUS.pill) {
      custom.pill = this.builderPillRadius();
    }

    if (this.builderBodyRadius() !== DEFAULT_RADIUS.body) {
      custom.body = this.builderBodyRadius();
    }

    if (this.builderActionRadius() !== DEFAULT_RADIUS.action) {
      custom.action = this.builderActionRadius();
    }

    return custom;
  }

  toastDefault() {
    this.toast.show('Notification received', this.defaultOptions());
  }

  toastSuccess() {
    this.toast.success('Changes saved', this.defaultOptions());
  }

  toastError() {
    this.toast.error('Something went wrong', this.defaultOptions());
  }

  toastWarning() {
    this.toast.warning('Storage is almost full', this.defaultOptions());
  }

  toastInfo() {
    this.toast.info('New update available', this.defaultOptions());
  }

  toastWarningWithDescription() {
    this.toast.warning('Your session is about to expire', {
      ...this.defaultOptions(),
      description: 'You have been inactive for 25 minutes. Save your work or the session will close soon.',
    });
  }

  toastErrorWithDescription() {
    this.toast.error('Connection lost', {
      ...this.defaultOptions(),
      description: 'Unable to reach the server. Check your internet connection and try again.',
    });
  }

  toastErrorWithAction() {
    this.toast.error('Payment failed', {
      ...this.defaultOptions(),
      description: 'Your card ending in 4242 was declined. Please update your payment method.',
      action: {
        label: 'Update payment',
        onClick: () => this.toast.info('Opening billing settings...', this.defaultOptions()),
      },
    });
  }

  toastActionSuccess() {
    this.toast.info('Share link ready', {
      ...this.defaultOptions(),
      description: 'Your share link has been generated and is ready to copy.',
      action: {
        label: 'Copy to clipboard',
        onClick: () => {
          if (!navigator?.clipboard?.writeText) {
            return;
          }

          navigator.clipboard.writeText('https://example.com/share/abc123').catch(() => undefined);
        },
        successLabel: 'Copied!',
      },
    });
  }

  toastNoSpring() {
    this.toast.success('Smooth save', {
      ...this.defaultOptions(),
      spring: false,
      description: 'Spring animation is disabled for this toast.',
    });
  }

  promiseSuccessPill() {
    const defaults = this.defaultOptions();
    this.toast.promise(this.sleep(1800), {
      loading: 'Saving...',
      success: 'Changes saved',
      error: 'Something went wrong',
      fillColor: defaults.fillColor,
      borderColor: defaults.borderColor,
      borderWidth: defaults.borderWidth,
      typeColors: defaults.typeColors,
      radius: defaults.radius,
      timing: {
        displayDuration: 3600,
      },
      spring: this.builderSpring(),
      bounce: this.builderBounce(),
    });
  }

  promiseErrorExpanded() {
    const defaults = this.defaultOptions();
    this.toast.promise(this.failAfter(1800), {
      loading: 'Uploading file...',
      success: 'Upload complete',
      error: 'Upload failed',
      fillColor: defaults.fillColor,
      borderColor: defaults.borderColor,
      borderWidth: defaults.borderWidth,
      typeColors: defaults.typeColors,
      radius: defaults.radius,
      description: {
        error: 'You are over your storage quota. Upgrade your plan and retry.',
      },
      action: {
        error: {
          label: 'Retry',
          onClick: () => this.promiseSuccessPill(),
        },
      },
      timing: {
        displayDuration: 4400,
      },
    });
  }

  private defaultOptions(): GoeyToastOptions {
    return {
      fillColor: DEFAULT_FILL_COLOR,
      typeColors: { ...DEFAULT_TYPE_COLORS },
      radius: { ...DEFAULT_RADIUS },
      timing: {
        displayDuration: 3200,
      },
      spring: DEFAULT_SPRING,
      bounce: DEFAULT_BOUNCE,
    };
  }

  private showByType(type: DemoToastType, title: string, options: GoeyToastOptions) {
    switch (type) {
      case 'success':
        this.toast.success(title, options);
        return;
      case 'error':
        this.toast.error(title, options);
        return;
      case 'warning':
        this.toast.warning(title, options);
        return;
      case 'info':
        this.toast.info(title, options);
        return;
      default:
        this.toast.show(title, options);
    }
  }

  private copyText(value: string, marker: WritableSignal<boolean>) {
    if (!navigator?.clipboard?.writeText) {
      return;
    }

    navigator.clipboard
      .writeText(value)
      .then(() => {
        marker.set(true);
        setTimeout(() => marker.set(false), 1500);
      })
      .catch(() => undefined);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private failAfter(ms: number) {
    return new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Failed')), ms);
    });
  }
}

function escapeSingleQuote(value: string): string {
  return value.replaceAll("'", "\\'");
}
