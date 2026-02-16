import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  QueryList,
  signal,
  SimpleChanges,
  ViewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { GoeyToastService } from './goey-toast.service';
import { GoeyToastOffset, GoeyToastPosition, GoeyToastTheme } from './goey-toast.types';
import { GoeyToastItemComponent } from './goey-toast-item.component';
import { MAX_VISIBLE_STACK_TOASTS, TOAST_PILL_HEIGHT } from './goey-toast.constants';
import { clamp, toCssLength } from './goey-toast.utils';

@Component({
  selector: 'goey-toaster',
  standalone: true,
  imports: [GoeyToastItemComponent],
  templateUrl: './goey-toaster.component.html',
  styleUrl: './goey-toaster.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoeyToasterComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() position: GoeyToastPosition = 'bottom-right';
  @Input() theme: GoeyToastTheme = 'light';
  @Input() gap: number = 14;
  @Input() offset: GoeyToastOffset = 24;
  @Input() overlap: number = 24;
  /**
   * Number of toasts to render in the stack.
   * Clamped to [1, MAX_VISIBLE_STACK_TOASTS] to match upstream stacking behavior.
   */
  @Input() visibleToasts: number = MAX_VISIBLE_STACK_TOASTS;
  @Input() spring = true;
  @Input() bounce = 0.4;

  private readonly service = inject(GoeyToastService);
  private readonly stackHovered = signal(false);
  private readonly enteringHeadId = signal<string | null>(null);
  private readonly stackHeights = signal<number[]>([]);

  readonly toasts = toSignal(this.service.toasts$, { initialValue: [] });
  @ViewChildren('stackItem') private readonly stackItemRefs!: QueryList<ElementRef<HTMLDivElement>>;

  private previousHeadId: string | null = null;
  private enterClearTimer: ReturnType<typeof setTimeout> | null = null;
  private stackResizeObserver: ResizeObserver | null = null;
  private stackRefsSub: Subscription | null = null;

  constructor() {
    effect(() => {
      const nextHeadId = this.toasts()[0]?.id ?? null;

      if (!nextHeadId) {
        this.previousHeadId = null;
        this.enteringHeadId.set(null);
        if (this.enterClearTimer) {
          clearTimeout(this.enterClearTimer);
          this.enterClearTimer = null;
        }
        return;
      }

      if (this.previousHeadId === null) {
        this.previousHeadId = nextHeadId;
        this.triggerHeadEntry(nextHeadId);
        return;
      }

      if (nextHeadId === this.previousHeadId) {
        return;
      }

      this.previousHeadId = nextHeadId;
      this.triggerHeadEntry(nextHeadId);
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

  ngAfterViewInit(): void {
    this.watchStackItems();
    this.stackRefsSub = this.stackItemRefs.changes.subscribe(() => {
      this.watchStackItems();
    });
  }

  ngOnDestroy(): void {
    if (this.enterClearTimer) {
      clearTimeout(this.enterClearTimer);
      this.enterClearTimer = null;
    }

    this.stackResizeObserver?.disconnect();
    this.stackResizeObserver = null;

    this.stackRefsSub?.unsubscribe();
    this.stackRefsSub = null;
  }

  offsetStyle(): string {
    return toCssLength(this.offset);
  }

  visibleStackToasts() {
    const max = clamp(Math.round(this.visibleToasts), 1, MAX_VISIBLE_STACK_TOASTS);
    return this.toasts().slice(0, max);
  }

  isEnteringToast(toastId: string, index: number): boolean {
    return index === 0 && this.enteringHeadId() === toastId;
  }

  onStackEnter(): void {
    this.stackHovered.set(true);
    this.measureStackHeights();
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
    const overlap = clamp(this.overlap, 1, TOAST_PILL_HEIGHT - 2);
    const collapsedStep = TOAST_PILL_HEIGHT - overlap;
    const expandedGap = Math.max(6, this.gap);
    let distance = index * collapsedStep;

    if (this.stackHovered()) {
      const heights = this.stackHeights();
      distance = 0;
      for (let i = 0; i < index; i += 1) {
        const height = heights[i] ?? TOAST_PILL_HEIGHT;
        distance += height + expandedGap;
      }
    }

    const offset = direction * distance;

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

  private triggerHeadEntry(headId: string): void {
    this.enteringHeadId.set(headId);

    if (this.enterClearTimer) {
      clearTimeout(this.enterClearTimer);
    }

    this.enterClearTimer = setTimeout(() => {
      this.enteringHeadId.set(null);
      this.enterClearTimer = null;
    }, 420);
  }

  private watchStackItems(): void {
    this.stackResizeObserver?.disconnect();

    if (typeof ResizeObserver === 'undefined') {
      this.measureStackHeights();
      return;
    }

    this.stackResizeObserver = new ResizeObserver(() => {
      this.measureStackHeights();
    });

    this.stackItemRefs.forEach((itemRef) => {
      this.stackResizeObserver?.observe(itemRef.nativeElement);
    });

    this.measureStackHeights();
  }

  private measureStackHeights(): void {
    if (!this.stackItemRefs) {
      return;
    }

    const heights = this.stackItemRefs.toArray().map((itemRef) =>
      Math.max(
        TOAST_PILL_HEIGHT,
        Math.round(itemRef.nativeElement.getBoundingClientRect().height)
      )
    );
    this.stackHeights.set(heights);
  }
}
