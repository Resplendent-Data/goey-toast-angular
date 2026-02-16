import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  signal,
  SimpleChanges,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { GoeyToastService } from './goey-toast.service';
import { GoeyToastOffset, GoeyToastPosition, GoeyToastTheme } from './goey-toast.types';
import { GoeyToastItemComponent } from './goey-toast-item.component';

@Component({
  selector: 'goey-toaster',
  standalone: true,
  imports: [GoeyToastItemComponent],
  templateUrl: './goey-toaster.component.html',
  styleUrl: './goey-toaster.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoeyToasterComponent implements OnInit, OnChanges, OnDestroy {
  private static readonly PILL_HEIGHT = 34;

  @Input() position: GoeyToastPosition = 'bottom-right';
  @Input() theme: GoeyToastTheme = 'light';
  @Input() gap: number = 14;
  @Input() offset: GoeyToastOffset = 24;
  @Input() overlap: number = 24;
  @Input() visibleToasts: number = 4;
  @Input() spring = true;
  @Input() bounce = 0.4;

  private readonly service = inject(GoeyToastService);
  private readonly stackHovered = signal(false);
  private readonly enteringHeadId = signal<string | null>(null);

  readonly toasts = toSignal(this.service.toasts$, { initialValue: [] });

  private previousHeadId: string | null = null;
  private enterClearTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const nextHeadId = this.toasts()[0]?.id ?? null;

      if (!nextHeadId) {
        this.previousHeadId = null;
        this.enteringHeadId.set(null);
        return;
      }

      if (this.previousHeadId === null) {
        this.previousHeadId = nextHeadId;
        return;
      }

      if (nextHeadId === this.previousHeadId) {
        return;
      }

      this.previousHeadId = nextHeadId;
      this.enteringHeadId.set(nextHeadId);

      if (this.enterClearTimer) {
        clearTimeout(this.enterClearTimer);
      }

      this.enterClearTimer = setTimeout(() => {
        this.enteringHeadId.set(null);
        this.enterClearTimer = null;
      }, 300);
    });
  }

  ngOnInit(): void {
    this.syncAnimationDefaults();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['spring'] || changes['bounce']) {
      this.syncAnimationDefaults();
    }
  }

  ngOnDestroy(): void {
    if (this.enterClearTimer) {
      clearTimeout(this.enterClearTimer);
      this.enterClearTimer = null;
    }
  }

  offsetStyle(): string {
    return toCssLength(this.offset);
  }

  visibleStackToasts() {
    const max = clamp(Math.round(this.visibleToasts), 1, 4);
    return this.toasts().slice(0, max);
  }

  isEnteringToast(toastId: string, index: number): boolean {
    return index === 0 && this.enteringHeadId() === toastId;
  }

  onStackEnter(): void {
    this.stackHovered.set(true);
  }

  onStackLeave(event: MouseEvent): void {
    const relatedTarget = event.relatedTarget as Element | null;
    if (relatedTarget && relatedTarget.closest('.goey-toaster')) {
      return;
    }

    this.stackHovered.set(false);
  }

  stackItemTransform(index: number): string {
    const direction = this.position.startsWith('bottom') ? -1 : 1;
    const overlap = clamp(this.overlap, 1, GoeyToasterComponent.PILL_HEIGHT - 2);
    const collapsedStep = GoeyToasterComponent.PILL_HEIGHT - overlap;
    const expandedStep = GoeyToasterComponent.PILL_HEIGHT + Math.max(6, this.gap);
    const step = this.stackHovered() ? expandedStep : collapsedStep;
    const offset = direction * index * step;

    if (this.position.endsWith('center')) {
      return `translate(-50%, ${offset.toFixed(2)}px)`;
    }

    return `translateY(${offset.toFixed(2)}px)`;
  }

  private syncAnimationDefaults(): void {
    this.service.setDefaults({
      spring: this.spring,
      bounce: this.bounce,
    });
  }
}

function toCssLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}
