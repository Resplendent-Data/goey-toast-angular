import {
  AfterViewInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { GoeyToastService } from './goey-toast.service';
import { GoeyToastAction, GoeyToastItem, GoeyToastPosition, GoeyToastType } from './goey-toast.types';

interface GoeyToastDimensions {
  pillWidth: number;
  bodyWidth: number;
  totalHeight: number;
}

const PILL_HEIGHT = 34;
const EXPAND_DELAY_MS = 330;
const COLLAPSE_DURATION_MS = 900;
const EXPAND_SPRING_DURATION_MS = 900;
const EXPAND_EASE_DURATION_MS = 600;
const REDUCED_MOTION_COLLAPSE_MS = 10;
const COLLAPSE_HOLD_BEFORE_DISMISS_MS = 800;
const ACTION_SUCCESS_DISMISS_MS = 1200;

@Component({
  selector: 'goey-toast-item',
  standalone: true,
  templateUrl: './goey-toast-item.component.html',
  styleUrl: './goey-toast-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoeyToastItemComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) toast!: GoeyToastItem;
  @Input({ required: true }) position: GoeyToastPosition = 'bottom-right';

  @ViewChild('wrapper', { static: true }) private readonly wrapperRef!: ElementRef<HTMLDivElement>;
  @ViewChild('svg', { static: true }) private readonly svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('path', { static: true }) private readonly pathRef!: ElementRef<SVGPathElement>;
  @ViewChild('content', { static: true }) private readonly contentRef!: ElementRef<HTMLDivElement>;
  @ViewChild('header', { static: true }) private readonly headerRef!: ElementRef<HTMLDivElement>;

  private readonly service = inject(GoeyToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly renderBody = signal(false);
  readonly bodyVisible = signal(false);
  readonly actionSuccessLabel = signal<string | null>(null);

  private readonly prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private collapsedDims: GoeyToastDimensions = {
    pillWidth: 0,
    bodyWidth: 0,
    totalHeight: PILL_HEIGHT,
  };

  private expandedDims: GoeyToastDimensions = {
    pillWidth: 0,
    bodyWidth: 0,
    totalHeight: PILL_HEIGHT,
  };

  private morphProgress = 0;
  private viewReady = false;
  private hovering = false;
  private preDismissing = false;
  private removed = false;
  private previousType: GoeyToastType | null = null;

  private expandTimer: ReturnType<typeof setTimeout> | null = null;
  private preDismissTimer: ReturnType<typeof setTimeout> | null = null;
  private dismissAfterCollapseTimer: ReturnType<typeof setTimeout> | null = null;
  private actionSuccessTimer: ReturnType<typeof setTimeout> | null = null;
  private bodyRevealTimer: ReturnType<typeof setTimeout> | null = null;

  private remainingDismissMs: number | null = null;
  private dismissTimerArmedMs = 0;
  private dismissTimerStartTs = 0;

  private rafId: number | null = null;
  private shakeRafId: number | null = null;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.syncFromToast();
    this.previousType = this.toast.type;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) {
      return;
    }

    if (changes['toast']) {
      if (this.previousType && this.previousType !== 'error' && this.toast.type === 'error') {
        this.triggerErrorShake();
      }
      this.previousType = this.toast.type;
    }

    this.syncFromToast();
  }

  ngOnDestroy(): void {
    this.stopAllTimers();
    this.stopMorphAnimation();
    this.stopShakeAnimation();
  }

  wrapperClass(): string {
    return joinClasses(
      'goey-wrapper',
      this.isRight() ? 'goey-right' : null,
      this.isCenter() ? 'goey-center' : null,
      this.toast.state === 'closing' ? 'goey-finalClosing' : null,
      this.toast.classNames?.wrapper
    );
  }

  contentClass(): string {
    return joinClasses(
      'goey-content',
      this.renderBody() ? 'goey-contentExpanded' : 'goey-contentCompact',
      this.isRight() ? 'goey-contentRight' : null,
      this.isCenter() ? 'goey-contentCenter' : null,
      this.toast.classNames?.content
    );
  }

  headerClass(): string {
    return joinClasses('goey-header', this.toast.classNames?.header);
  }

  titleClass(): string {
    return joinClasses('goey-title', this.titleToneClass(), this.toast.classNames?.title);
  }

  iconClass(): string {
    return joinClasses('goey-iconWrapper', this.toast.classNames?.icon);
  }

  descriptionClass(): string {
    return joinClasses(
      'goey-description',
      this.bodyVisible() ? 'goey-bodyVisible' : 'goey-bodyHidden',
      this.toast.classNames?.description
    );
  }

  actionWrapperClass(): string {
    return joinClasses(
      'goey-actionWrapper',
      this.bodyVisible() ? 'goey-bodyVisible' : 'goey-bodyHidden',
      this.toast.classNames?.actionWrapper
    );
  }

  actionButtonClass(): string {
    return joinClasses('goey-actionButton', this.actionToneClass(), this.toast.classNames?.actionButton);
  }

  currentTitle(): string {
    return this.actionSuccessLabel() ?? this.toast.title;
  }

  currentType(): GoeyToastType {
    return this.actionSuccessLabel() ? 'success' : this.toast.type;
  }

  currentDescription(): string | undefined {
    if (this.actionSuccessLabel()) {
      return undefined;
    }

    return this.toast.description;
  }

  currentAction(): GoeyToastAction | undefined {
    if (this.actionSuccessLabel()) {
      return undefined;
    }

    return this.toast.action;
  }

  iconColorClass(): string {
    return this.titleToneClass();
  }

  onMouseEnter(): void {
    this.hovering = true;

    if (this.preDismissTimer) {
      clearTimeout(this.preDismissTimer);
      this.preDismissTimer = null;

      const elapsed = Date.now() - this.dismissTimerStartTs;
      this.remainingDismissMs = Math.max(0, this.dismissTimerArmedMs - elapsed);
    }

    if (this.preDismissing && this.canExpandBody()) {
      this.cancelPreDismissAndReExpand();
    }
  }

  onMouseLeave(): void {
    this.hovering = false;

    if (this.preDismissing && this.morphProgress <= 0.001) {
      this.scheduleFinalDismiss();
      return;
    }

    if (this.canManageExpandedDismiss()) {
      this.startPreDismissTimer();
    }
  }

  runAction(action: GoeyToastAction): void {
    try {
      action.onClick();
    } catch (error) {
      console.error('[goey-toast-angular] Toast action handler threw an error:', error);
    }

    if (!action.successLabel) {
      return;
    }

    this.actionSuccessLabel.set(action.successLabel);
    this.stopExpandedLifecycleTimers();
    this.collapseToPill(() => {
      this.actionSuccessTimer = setTimeout(() => this.dismissToast(), ACTION_SUCCESS_DISMISS_MS);
    });
  }

  private syncFromToast(): void {
    this.measureCollapsedDims();
    this.applyMorphFrame();

    if (this.toast.state === 'closing') {
      this.stopShakeAnimation(true);
      this.stopExpandedLifecycleTimers();
      this.bodyVisible.set(false);
      this.renderBody.set(false);
      this.preDismissing = false;
      this.animateMorphTo(0);
      return;
    }

    if (this.canExpandBody()) {
      if (!this.renderBody()) {
        this.expandIntoBlob();
      } else {
        this.measureExpandedDims();
        this.applyMorphFrame();
        this.startPreDismissTimer();
      }
    } else {
      this.stopExpandedLifecycleTimers();

      if (this.morphProgress > 0.001) {
        this.collapseToPill();
      } else {
        this.renderBody.set(false);
        this.bodyVisible.set(false);
        this.morphProgress = 0;
        this.expandedDims = { ...this.collapsedDims };
        this.applyMorphFrame();
      }
    }
  }

  private expandIntoBlob(): void {
    this.stopExpandedLifecycleTimers();
    this.preDismissing = false;
    this.bodyVisible.set(false);
    this.renderBody.set(false);
    this.morphProgress = 0;
    this.applyMorphFrame();

    const expandDelay = this.prefersReducedMotion ? 0 : EXPAND_DELAY_MS;
    this.expandTimer = setTimeout(() => {
      this.renderBody.set(true);
      this.cdr.detectChanges();
      this.measureExpandedDims();
      this.applyMorphFrame();
      this.animateMorphTo(1);
      this.bodyRevealTimer = setTimeout(() => {
        this.bodyVisible.set(true);
      }, this.prefersReducedMotion ? 0 : 90);
      this.startPreDismissTimer();
    }, expandDelay);
  }

  private startPreDismissTimer(): void {
    if (!this.canManageExpandedDismiss() || this.hovering || this.preDismissing) {
      return;
    }

    const displayDuration = this.toast.timing?.displayDuration ?? this.toast.duration;
    if (displayDuration <= 0) {
      return;
    }

    const expandDelay = this.prefersReducedMotion ? 0 : EXPAND_DELAY_MS;
    const collapseDuration = this.prefersReducedMotion ? REDUCED_MOTION_COLLAPSE_MS : COLLAPSE_DURATION_MS;
    const baseDelay = displayDuration - expandDelay - collapseDuration;
    if (baseDelay <= 0) {
      return;
    }

    const delay = this.remainingDismissMs ?? baseDelay;
    if (delay <= 0) {
      return;
    }

    this.dismissTimerArmedMs = delay;
    this.dismissTimerStartTs = Date.now();
    this.remainingDismissMs = null;

    this.preDismissTimer = setTimeout(() => {
      this.preDismissTimer = null;
      this.startPreDismissCollapse();
    }, delay);
  }

  private startPreDismissCollapse(): void {
    if (this.preDismissing || this.toast.state !== 'open') {
      return;
    }

    this.preDismissing = true;
    this.bodyVisible.set(false);

    this.collapseToPill(() => {
      if (this.hovering) {
        return;
      }

      this.scheduleFinalDismiss();
    });
  }

  private cancelPreDismissAndReExpand(): void {
    this.preDismissing = false;
    this.remainingDismissMs = null;

    if (this.dismissAfterCollapseTimer) {
      clearTimeout(this.dismissAfterCollapseTimer);
      this.dismissAfterCollapseTimer = null;
    }

    this.renderBody.set(true);
    this.cdr.detectChanges();
    this.measureExpandedDims();
    this.applyMorphFrame();
    this.bodyVisible.set(true);
    this.animateMorphTo(1);

    if (!this.hovering) {
      this.startPreDismissTimer();
    }
  }

  private collapseToPill(onComplete?: () => void): void {
    this.bodyVisible.set(false);

    this.animateMorphTo(0, () => {
      this.renderBody.set(false);
      onComplete?.();
    });
  }

  private scheduleFinalDismiss(): void {
    if (this.dismissAfterCollapseTimer) {
      clearTimeout(this.dismissAfterCollapseTimer);
    }

    this.dismissAfterCollapseTimer = setTimeout(() => {
      if (!this.hovering) {
        this.dismissToast();
      }
    }, COLLAPSE_HOLD_BEFORE_DISMISS_MS);
  }

  private dismissToast(): void {
    if (this.removed || this.toast.state === 'closing') {
      return;
    }

    this.removed = true;
    this.service.dismiss(this.toast.id);
  }

  private measureCollapsedDims(): void {
    const contentEl = this.contentRef.nativeElement;

    this.clearMorphConstraints();

    const computed = getComputedStyle(contentEl);
    const horizontalPadding = toNumber(computed.paddingLeft) + toNumber(computed.paddingRight);
    const pillWidth = this.headerRef.nativeElement.offsetWidth + horizontalPadding;

    this.collapsedDims = {
      pillWidth,
      bodyWidth: pillWidth,
      totalHeight: PILL_HEIGHT,
    };

    if (this.expandedDims.bodyWidth <= 0) {
      this.expandedDims = { ...this.collapsedDims };
    }
  }

  private measureExpandedDims(): void {
    const contentEl = this.contentRef.nativeElement;

    this.clearMorphConstraints();

    const computed = getComputedStyle(contentEl);
    const horizontalPadding = toNumber(computed.paddingLeft) + toNumber(computed.paddingRight);
    const pillWidth = this.headerRef.nativeElement.offsetWidth + horizontalPadding;
    const bodyWidth = Math.max(contentEl.offsetWidth, pillWidth);
    const totalHeight = Math.max(contentEl.offsetHeight, PILL_HEIGHT);

    this.expandedDims = {
      pillWidth,
      bodyWidth,
      totalHeight,
    };
  }

  private clearMorphConstraints(): void {
    const wrapperEl = this.wrapperRef.nativeElement;
    const contentEl = this.contentRef.nativeElement;

    wrapperEl.style.width = '';
    contentEl.style.width = '';
    contentEl.style.maxHeight = '';
    contentEl.style.overflow = '';
    contentEl.style.clipPath = '';
  }

  private animateMorphTo(target: number, onComplete?: () => void): void {
    this.stopMorphAnimation();

    const from = this.morphProgress;
    if (this.prefersReducedMotion || Math.abs(target - from) < 0.001) {
      this.morphProgress = target;
      this.applyMorphFrame();
      onComplete?.();
      return;
    }

    const opening = target > from;
    const duration = opening
      ? (this.toast.spring ? EXPAND_SPRING_DURATION_MS : EXPAND_EASE_DURATION_MS)
      : COLLAPSE_DURATION_MS;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = this.toast.spring && (!this.preDismissing || opening)
        ? springEasing(progress, opening, this.toast.bounce)
        : easeInOut(progress);

      this.morphProgress = clamp(from + (target - from) * eased, 0, 1);
      this.applyMorphFrame();

      if (progress < 1) {
        this.rafId = requestAnimationFrame(tick);
        return;
      }

      this.rafId = null;
      this.morphProgress = target;
      this.applyMorphFrame();
      onComplete?.();
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private stopMorphAnimation(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private applyMorphFrame(): void {
    const t = clamp(this.morphProgress, 0, 1);
    const collapsed = this.collapsedDims;
    const expanded = this.expandedDims.bodyWidth > 0 ? this.expandedDims : this.collapsedDims;
    const collapsedPillWidth = collapsed.pillWidth;
    const expandedBodyWidth = expanded.bodyWidth;
    const expandedHeight = expanded.totalHeight;
    const centerWidth = Math.max(expandedBodyWidth, collapsedPillWidth);
    const maxWidth = this.isCenter() ? centerWidth : Math.max(expandedBodyWidth, collapsedPillWidth);
    const maxHeight = Math.max(expandedHeight, PILL_HEIGHT);

    const svgEl = this.svgRef.nativeElement;
    svgEl.setAttribute('width', `${maxWidth}`);
    svgEl.setAttribute('height', `${maxHeight}`);
    svgEl.setAttribute('viewBox', `0 0 ${maxWidth} ${maxHeight}`);

    const path = this.isCenter()
      ? morphPathCenter(collapsedPillWidth, centerWidth, expandedHeight, t)
      : morphPath(collapsedPillWidth, expandedBodyWidth, expandedHeight, t);
    this.pathRef.nativeElement.setAttribute('d', path);

    const wrapperEl = this.wrapperRef.nativeElement;
    const contentEl = this.contentRef.nativeElement;

    if (t >= 0.999) {
      wrapperEl.style.width = '';
      contentEl.style.width = '';
      contentEl.style.maxHeight = '';
      contentEl.style.overflow = '';
      contentEl.style.clipPath = '';
      return;
    }

    const pillWidth = Math.min(collapsedPillWidth, expandedBodyWidth);

    if (t > 0) {
      const currentWidth = pillWidth + (expandedBodyWidth - pillWidth) * t;
      const currentHeight = PILL_HEIGHT + (expandedHeight - PILL_HEIGHT) * t;

      wrapperEl.style.width = `${this.isCenter() ? centerWidth : currentWidth}px`;
      contentEl.style.width = `${this.isCenter() ? centerWidth : expandedBodyWidth}px`;
      contentEl.style.maxHeight = `${currentHeight}px`;
      contentEl.style.overflow = 'hidden';

      if (this.isCenter()) {
        const clip = Math.max(0, (centerWidth - currentWidth) / 2);
        contentEl.style.clipPath = `inset(0 ${clip}px 0 ${clip}px)`;
      } else {
        const clip = Math.max(0, expandedBodyWidth - currentWidth);
        contentEl.style.clipPath = this.isRight()
          ? `inset(0 0 0 ${clip}px)`
          : `inset(0 ${clip}px 0 0)`;
      }

      return;
    }

    wrapperEl.style.width = `${this.isCenter() ? centerWidth : pillWidth}px`;
    contentEl.style.maxHeight = `${PILL_HEIGHT}px`;
    contentEl.style.overflow = 'hidden';

    if (this.isCenter()) {
      contentEl.style.width = `${centerWidth}px`;
      const clip = Math.max(0, (centerWidth - pillWidth) / 2);
      contentEl.style.clipPath = `inset(0 ${clip}px 0 ${clip}px)`;
    } else {
      contentEl.style.width = '';
      contentEl.style.clipPath = '';
    }
  }

  private triggerErrorShake(): void {
    if (this.prefersReducedMotion || this.toast.state === 'closing') {
      return;
    }

    this.stopShakeAnimation();

    const wrapperEl = this.wrapperRef.nativeElement;
    const mirror = this.isRight() ? 'scaleX(-1)' : '';
    const startTime = performance.now();
    const duration = 400;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const decay = 1 - progress;
      const offset = Math.sin(progress * Math.PI * 6) * decay * 3;
      const shakeTransform = `translateX(${offset}px)`;

      wrapperEl.style.transform = mirror ? `${mirror} ${shakeTransform}` : shakeTransform;

      if (progress < 1) {
        this.shakeRafId = requestAnimationFrame(tick);
        return;
      }

      this.stopShakeAnimation(true);
    };

    this.shakeRafId = requestAnimationFrame(tick);
  }

  private stopShakeAnimation(resetTransform = false): void {
    if (this.shakeRafId !== null) {
      cancelAnimationFrame(this.shakeRafId);
      this.shakeRafId = null;
    }

    if (resetTransform && this.viewReady) {
      this.wrapperRef.nativeElement.style.transform = '';
    }
  }

  private stopExpandedLifecycleTimers(): void {
    if (this.expandTimer) {
      clearTimeout(this.expandTimer);
      this.expandTimer = null;
    }

    if (this.bodyRevealTimer) {
      clearTimeout(this.bodyRevealTimer);
      this.bodyRevealTimer = null;
    }

    if (this.preDismissTimer) {
      clearTimeout(this.preDismissTimer);
      this.preDismissTimer = null;
    }

    if (this.dismissAfterCollapseTimer) {
      clearTimeout(this.dismissAfterCollapseTimer);
      this.dismissAfterCollapseTimer = null;
    }

    this.remainingDismissMs = null;
  }

  private stopAllTimers(): void {
    this.stopExpandedLifecycleTimers();

    if (this.actionSuccessTimer) {
      clearTimeout(this.actionSuccessTimer);
      this.actionSuccessTimer = null;
    }
  }

  private canExpandBody(): boolean {
    return Boolean(this.currentDescription() || this.currentAction());
  }

  private canManageExpandedDismiss(): boolean {
    if (!this.canExpandBody()) {
      return false;
    }

    if (this.toast.type === 'loading') {
      return false;
    }

    return this.toast.state === 'open';
  }

  private isRight(): boolean {
    return this.position.endsWith('right');
  }

  private isCenter(): boolean {
    return this.position.endsWith('center');
  }

  private titleToneClass(): string {
    switch (this.currentType()) {
      case 'success':
        return 'goey-titleSuccess';
      case 'error':
        return 'goey-titleError';
      case 'warning':
        return 'goey-titleWarning';
      case 'info':
        return 'goey-titleInfo';
      case 'loading':
        return 'goey-titleLoading';
      default:
        return 'goey-titleDefault';
    }
  }

  private actionToneClass(): string {
    switch (this.currentType()) {
      case 'success':
        return 'goey-actionSuccess';
      case 'error':
        return 'goey-actionError';
      case 'warning':
        return 'goey-actionWarning';
      case 'info':
      case 'loading':
        return 'goey-actionInfo';
      default:
        return 'goey-actionDefault';
    }
  }
}

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function joinClasses(...values: Array<string | null | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(' ');
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

function easeInOut(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function springEasing(progress: number, opening: boolean, bounce: number): number {
  const safeBounce = clamp(bounce, 0.05, 0.8);

  if (progress === 0 || progress === 1) {
    return progress;
  }

  const amplitude = opening
    ? 0.35 + safeBounce * 0.85
    : 0.18 + safeBounce * 0.25;
  const damping = opening
    ? 7.5 - safeBounce * 4
    : 11 - safeBounce * 4;
  const frequency = opening
    ? 8 + safeBounce * 10
    : 10 + safeBounce * 6;

  const value = 1 - Math.exp(-damping * progress) * Math.cos(frequency * progress) * amplitude;
  return clamp(value, 0, opening ? 1.05 : 1.02);
}

export function morphPath(pillWidth: number, bodyWidth: number, totalHeight: number, progress: number): string {
  const radius = PILL_HEIGHT / 2;
  const safePillWidth = Math.min(pillWidth, bodyWidth);
  const bodyHeight = PILL_HEIGHT + (totalHeight - PILL_HEIGHT) * progress;

  if (progress <= 0 || bodyHeight - PILL_HEIGHT < 8) {
    return [
      `M 0,${radius}`,
      `A ${radius},${radius} 0 0 1 ${radius},0`,
      `H ${safePillWidth - radius}`,
      `A ${radius},${radius} 0 0 1 ${safePillWidth},${radius}`,
      `A ${radius},${radius} 0 0 1 ${safePillWidth - radius},${PILL_HEIGHT}`,
      `H ${radius}`,
      `A ${radius},${radius} 0 0 1 0,${radius}`,
      'Z',
    ].join(' ');
  }

  const curve = 14 * progress;
  const cornerRadius = Math.min(16, (bodyHeight - PILL_HEIGHT) * 0.45);
  const bodyWidthInterpolated = safePillWidth + (bodyWidth - safePillWidth) * progress;
  const bodyTop = PILL_HEIGHT - curve;
  const qEndX = Math.min(safePillWidth + curve, bodyWidthInterpolated - cornerRadius);

  return [
    `M 0,${radius}`,
    `A ${radius},${radius} 0 0 1 ${radius},0`,
    `H ${safePillWidth - radius}`,
    `A ${radius},${radius} 0 0 1 ${safePillWidth},${radius}`,
    `L ${safePillWidth},${bodyTop}`,
    `Q ${safePillWidth},${bodyTop + curve} ${qEndX},${bodyTop + curve}`,
    `H ${bodyWidthInterpolated - cornerRadius}`,
    `A ${cornerRadius},${cornerRadius} 0 0 1 ${bodyWidthInterpolated},${bodyTop + curve + cornerRadius}`,
    `L ${bodyWidthInterpolated},${bodyHeight - cornerRadius}`,
    `A ${cornerRadius},${cornerRadius} 0 0 1 ${bodyWidthInterpolated - cornerRadius},${bodyHeight}`,
    `H ${cornerRadius}`,
    `A ${cornerRadius},${cornerRadius} 0 0 1 0,${bodyHeight - cornerRadius}`,
    'Z',
  ].join(' ');
}

export function morphPathCenter(pillWidth: number, bodyWidth: number, totalHeight: number, progress: number): string {
  const radius = PILL_HEIGHT / 2;
  const safePillWidth = Math.min(pillWidth, bodyWidth);
  const pillOffset = (bodyWidth - safePillWidth) / 2;

  if (progress <= 0 || PILL_HEIGHT + (totalHeight - PILL_HEIGHT) * progress - PILL_HEIGHT < 8) {
    return [
      `M ${pillOffset},${radius}`,
      `A ${radius},${radius} 0 0 1 ${pillOffset + radius},0`,
      `H ${pillOffset + safePillWidth - radius}`,
      `A ${radius},${radius} 0 0 1 ${pillOffset + safePillWidth},${radius}`,
      `A ${radius},${radius} 0 0 1 ${pillOffset + safePillWidth - radius},${PILL_HEIGHT}`,
      `H ${pillOffset + radius}`,
      `A ${radius},${radius} 0 0 1 ${pillOffset},${radius}`,
      'Z',
    ].join(' ');
  }

  const bodyHeight = PILL_HEIGHT + (totalHeight - PILL_HEIGHT) * progress;
  const curve = 14 * progress;
  const cornerRadius = Math.min(16, (bodyHeight - PILL_HEIGHT) * 0.45);
  const bodyTop = PILL_HEIGHT - curve;
  const bodyCenter = bodyWidth / 2;
  const halfWidth = safePillWidth / 2 + ((bodyWidth - safePillWidth) / 2) * progress;
  const bodyLeft = bodyCenter - halfWidth;
  const bodyRight = bodyCenter + halfWidth;
  const qLeftX = Math.max(bodyLeft + cornerRadius, pillOffset - curve);
  const qRightX = Math.min(bodyRight - cornerRadius, pillOffset + safePillWidth + curve);

  return [
    `M ${pillOffset},${radius}`,
    `A ${radius},${radius} 0 0 1 ${pillOffset + radius},0`,
    `H ${pillOffset + safePillWidth - radius}`,
    `A ${radius},${radius} 0 0 1 ${pillOffset + safePillWidth},${radius}`,
    `L ${pillOffset + safePillWidth},${bodyTop}`,
    `Q ${pillOffset + safePillWidth},${bodyTop + curve} ${qRightX},${bodyTop + curve}`,
    `H ${bodyRight - cornerRadius}`,
    `A ${cornerRadius},${cornerRadius} 0 0 1 ${bodyRight},${bodyTop + curve + cornerRadius}`,
    `L ${bodyRight},${bodyHeight - cornerRadius}`,
    `A ${cornerRadius},${cornerRadius} 0 0 1 ${bodyRight - cornerRadius},${bodyHeight}`,
    `H ${bodyLeft + cornerRadius}`,
    `A ${cornerRadius},${cornerRadius} 0 0 1 ${bodyLeft},${bodyHeight - cornerRadius}`,
    `L ${bodyLeft},${bodyTop + curve + cornerRadius}`,
    `A ${cornerRadius},${cornerRadius} 0 0 1 ${bodyLeft + cornerRadius},${bodyTop + curve}`,
    `H ${qLeftX}`,
    `Q ${pillOffset},${bodyTop + curve} ${pillOffset},${bodyTop}`,
    'Z',
  ].join(' ');
}
