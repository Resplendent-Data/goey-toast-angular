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
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { GoeyToastService } from './goey-toast.service';
import { GoeyToastAction, GoeyToastItem, GoeyToastPosition, GoeyToastType } from './goey-toast.types';
import { TOAST_PILL_HEIGHT } from './goey-toast.constants';
import { clamp } from './goey-toast.utils';
import { GoeyToastIconComponent } from './goey-toast-icon.component';

interface GoeyToastDimensions {
  pillWidth: number;
  bodyWidth: number;
  totalHeight: number;
}

interface GoeyMorphRadii {
  pill: number;
  body: number;
}

const EXPAND_DELAY_MS = 330;
const COLLAPSE_DURATION_MS = 900;
const EXPAND_SPRING_DURATION_MS = 900;
const EXPAND_EASE_DURATION_MS = 600;
const REDUCED_MOTION_COLLAPSE_MS = 10;
const COLLAPSE_HOLD_BEFORE_DISMISS_MS = 450;
const ACTION_SUCCESS_DISMISS_MS = 1200;
const DEFAULT_MORPH_RADII: GoeyMorphRadii = {
  pill: TOAST_PILL_HEIGHT / 2,
  body: 16,
};

@Component({
  selector: 'goey-toast-item',
  standalone: true,
  imports: [GoeyToastIconComponent],
  templateUrl: './goey-toast-item.component.html',
  styleUrl: './goey-toast-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoeyToastItemComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) toast!: GoeyToastItem;
  @Input({ required: true }) position: GoeyToastPosition = 'bottom-right';
  @Input() stackHovered = false;

  @ViewChild('wrapper', { static: true }) private readonly wrapperRef!: ElementRef<HTMLDivElement>;
  @ViewChild('svg', { static: true }) private readonly svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('path', { static: true }) private readonly pathRef!: ElementRef<SVGPathElement>;
  @ViewChild('content', { static: true }) private readonly contentRef!: ElementRef<HTMLDivElement>;
  @ViewChild('header', { static: true }) private readonly headerRef!: ElementRef<HTMLDivElement>;

  private readonly service = inject(GoeyToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly renderBody = signal(false);
  readonly descriptionVisible = signal(false);
  readonly actionVisible = signal(false);
  readonly actionSuccessLabel = signal<string | null>(null);

  private prefersReducedMotion = false;
  private reducedMotionQuery: MediaQueryList | null = null;
  private reducedMotionChangeHandler: ((event: MediaQueryListEvent) => void) | null = null;

  private collapsedDims: GoeyToastDimensions = {
    pillWidth: 0,
    bodyWidth: 0,
    totalHeight: TOAST_PILL_HEIGHT,
  };

  private expandedDims: GoeyToastDimensions = {
    pillWidth: 0,
    bodyWidth: 0,
    totalHeight: TOAST_PILL_HEIGHT,
  };

  private morphProgress = 0;
  private viewReady = false;
  private localHovering = false;
  private hovering = false;
  private preDismissing = false;
  private removed = false;
  private previousType: GoeyToastType | null = null;

  private expandTimer: ReturnType<typeof setTimeout> | null = null;
  private preDismissTimer: ReturnType<typeof setTimeout> | null = null;
  private dismissAfterCollapseTimer: ReturnType<typeof setTimeout> | null = null;
  private actionSuccessTimer: ReturnType<typeof setTimeout> | null = null;
  private bodyRevealTimer: ReturnType<typeof setTimeout> | null = null;
  private actionRevealTimer: ReturnType<typeof setTimeout> | null = null;

  private remainingDismissMs: number | null = null;
  private dismissTimerArmedMs = 0;
  private dismissTimerStartTs = 0;

  private rafId: number | null = null;
  private shakeRafId: number | null = null;

  constructor() {
    afterNextRender(() => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return;
      }

      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = query.matches;

      const onChange = (event: MediaQueryListEvent) => {
        this.prefersReducedMotion = event.matches;
      };

      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', onChange);
      } else {
        query.addListener(onChange);
      }

      this.reducedMotionQuery = query;
      this.reducedMotionChangeHandler = onChange;
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.syncFromToast();
    this.previousType = this.toast.type;
    this.syncHoverState();
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

    if (changes['stackHovered']) {
      this.syncHoverState();
    }
  }

  ngOnDestroy(): void {
    this.teardownReducedMotionTracking();
    this.stopAllTimers();
    this.stopMorphAnimation();
    this.stopShakeAnimation();
  }

  wrapperClass(): string {
    return joinClasses(
      'goey-wrapper',
      this.isRight() ? 'goey-right' : null,
      this.isCenter() ? 'goey-center' : null,
      this.isTop() ? 'goey-top' : 'goey-bottom',
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
    return joinClasses('goey-iconWrapper', this.titleToneClass(), this.toast.classNames?.icon);
  }

  descriptionClass(): string {
    return joinClasses(
      'goey-description',
      this.descriptionVisible() ? 'goey-bodyVisible' : 'goey-bodyHidden',
      this.toast.classNames?.description
    );
  }

  actionWrapperClass(): string {
    return joinClasses(
      'goey-actionWrapper',
      this.actionVisible() ? 'goey-bodyVisible' : 'goey-bodyHidden',
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

  titleColorStyle(): string | null {
    return this.typeToneColor();
  }

  iconColorStyle(): string | null {
    return this.typeToneColor();
  }

  actionTextColorStyle(): string | null {
    return this.typeToneColor();
  }

  actionBackgroundStyle(): string | null {
    const tone = this.typeToneColor();
    if (!tone) {
      return null;
    }

    return `color-mix(in srgb, ${tone} 22%, transparent)`;
  }

  actionBorderRadiusStyle(): string | null {
    const radius = this.toast.radius?.action;
    if (typeof radius === 'undefined') {
      return null;
    }

    if (typeof radius === 'number') {
      return `${clamp(radius, 0, 999)}px`;
    }

    return radius;
  }

  onMouseEnter(): void {
    if (!this.localHovering) {
      this.localHovering = true;
    }
    this.syncHoverState();
  }

  onMouseLeave(): void {
    if (this.localHovering) {
      this.localHovering = false;
    }
    this.syncHoverState();
  }

  runAction(action: GoeyToastAction): void {
    let succeeded = true;

    try {
      action.onClick();
    } catch (error) {
      succeeded = false;
      console.error('[goey-toast-angular] Toast action handler threw an error:', error);
    }

    if (!succeeded || !action.successLabel) {
      return;
    }

    this.actionSuccessLabel.set(action.successLabel);
    this.stopExpandedLifecycleTimers();
    this.collapseToPill(() => {
      this.actionSuccessTimer = setTimeout(() => this.dismissToast(), ACTION_SUCCESS_DISMISS_MS);
    });
  }

  private syncFromToast(): void {
    this.cdr.detectChanges();
    this.measureCollapsedDims();
    this.applyMorphFrame();

    if (this.toast.state === 'closing') {
      this.stopShakeAnimation(true);
      this.stopExpandedLifecycleTimers();
      this.descriptionVisible.set(false);
      this.actionVisible.set(false);
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
        this.descriptionVisible.set(false);
        this.actionVisible.set(false);
        this.morphProgress = 0;
        this.expandedDims = { ...this.collapsedDims };
        this.applyMorphFrame();
      }
    }
  }

  private syncHoverState(): void {
    const nextHovering = this.isHoveringActive();
    if (nextHovering === this.hovering) {
      return;
    }

    this.hovering = nextHovering;

    if (this.hovering) {
      if (this.preDismissTimer) {
        clearTimeout(this.preDismissTimer);
        this.preDismissTimer = null;

        const elapsed = Date.now() - this.dismissTimerStartTs;
        this.remainingDismissMs = Math.max(0, this.dismissTimerArmedMs - elapsed);
      }

      if (this.preDismissing && this.canExpandBody()) {
        this.cancelPreDismissAndReExpand();
      }

      return;
    }

    if (this.preDismissing && this.morphProgress <= 0.001) {
      this.scheduleFinalDismiss();
      return;
    }

    if (this.canManageExpandedDismiss()) {
      this.startPreDismissTimer();
    }
  }

  private expandIntoBlob(): void {
    this.stopExpandedLifecycleTimers();
    this.preDismissing = false;
    this.descriptionVisible.set(false);
    this.actionVisible.set(false);
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
      const revealDelay = this.prefersReducedMotion ? 0 : 90;
      this.bodyRevealTimer = setTimeout(() => {
        this.descriptionVisible.set(true);
        const stagger = this.currentDescription() && this.currentAction() ? 70 : 0;
        this.actionRevealTimer = setTimeout(() => {
          this.actionVisible.set(true);
        }, this.prefersReducedMotion ? 0 : stagger);
      }, revealDelay);
      this.startPreDismissTimer();
    }, expandDelay);
  }

  private startPreDismissTimer(): void {
    if (!this.canManageExpandedDismiss() || this.isHoveringActive() || this.preDismissing) {
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

      if (this.isHoveringActive()) {
        return;
      }

      this.startPreDismissCollapse();
    }, delay);
  }

  private startPreDismissCollapse(): void {
    if (this.isHoveringActive()) {
      return;
    }

    if (this.preDismissing || this.toast.state !== 'open') {
      return;
    }

    this.preDismissing = true;
    this.descriptionVisible.set(false);
    this.actionVisible.set(false);

    this.collapseToPill(() => {
      if (this.isHoveringActive()) {
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
    this.descriptionVisible.set(true);
    this.actionVisible.set(true);
    this.animateMorphTo(1);

    if (!this.hovering) {
      this.startPreDismissTimer();
    }
  }

  private collapseToPill(onComplete?: () => void): void {
    this.descriptionVisible.set(false);
    this.actionVisible.set(false);

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
      if (!this.isHoveringActive()) {
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
      totalHeight: TOAST_PILL_HEIGHT,
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
    const rect = contentEl.getBoundingClientRect();
    const bodyWidth = Math.max(Math.ceil(rect.width), pillWidth);
    const totalHeight = Math.max(Math.ceil(rect.height), TOAST_PILL_HEIGHT);

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
    const maxHeight = Math.max(expandedHeight, TOAST_PILL_HEIGHT);
    const radii = this.resolveMorphRadii();

    const svgEl = this.svgRef.nativeElement;
    svgEl.setAttribute('width', `${maxWidth}`);
    svgEl.setAttribute('height', `${maxHeight}`);
    svgEl.setAttribute('viewBox', `0 0 ${maxWidth} ${maxHeight}`);

    const path = this.isCenter()
      ? morphPathCenter(collapsedPillWidth, centerWidth, expandedHeight, t, radii)
      : morphPath(collapsedPillWidth, expandedBodyWidth, expandedHeight, t, radii);
    this.pathRef.nativeElement.setAttribute('d', path);

    svgEl.classList.toggle('goey-blobExpanded', t > 0.3);

    const wrapperEl = this.wrapperRef.nativeElement;
    const contentEl = this.contentRef.nativeElement;

    if (t >= 0.999 && this.rafId === null) {
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
      const currentHeight = TOAST_PILL_HEIGHT + (expandedHeight - TOAST_PILL_HEIGHT) * t;

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
    contentEl.style.maxHeight = `${TOAST_PILL_HEIGHT}px`;
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

    if (this.actionRevealTimer) {
      clearTimeout(this.actionRevealTimer);
      this.actionRevealTimer = null;
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

  private teardownReducedMotionTracking(): void {
    if (!this.reducedMotionQuery || !this.reducedMotionChangeHandler) {
      return;
    }

    if (typeof this.reducedMotionQuery.removeEventListener === 'function') {
      this.reducedMotionQuery.removeEventListener('change', this.reducedMotionChangeHandler);
    } else {
      this.reducedMotionQuery.removeListener(this.reducedMotionChangeHandler);
    }

    this.reducedMotionQuery = null;
    this.reducedMotionChangeHandler = null;
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

  private isTop(): boolean {
    return this.position.startsWith('top');
  }

  private isRight(): boolean {
    return this.position.endsWith('right');
  }

  private isCenter(): boolean {
    return this.position.endsWith('center');
  }

  private isHoveringActive(): boolean {
    return this.localHovering || this.stackHovered;
  }

  private typeToneColor(): string | null {
    const color = this.toast.typeColors?.[this.currentType()];
    return color?.trim() ? color : null;
  }

  private resolveMorphRadii(): GoeyMorphRadii {
    const pill = finiteNumber(this.toast.radius?.pill, DEFAULT_MORPH_RADII.pill);
    const body = finiteNumber(this.toast.radius?.body, DEFAULT_MORPH_RADII.body);

    return {
      pill: clamp(pill, 0, TOAST_PILL_HEIGHT / 2),
      body: clamp(body, 0, 32),
    };
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

function finiteNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function joinClasses(...values: Array<string | null | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(' ');
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

export function morphPath(
  pillWidth: number,
  bodyWidth: number,
  totalHeight: number,
  progress: number,
  radii: GoeyMorphRadii = DEFAULT_MORPH_RADII
): string {
  const safePillWidth = Math.min(pillWidth, bodyWidth);
  const radius = Math.min(clamp(radii.pill, 0, TOAST_PILL_HEIGHT / 2), safePillWidth / 2);
  const bodyHeight = TOAST_PILL_HEIGHT + (totalHeight - TOAST_PILL_HEIGHT) * progress;

  if (progress <= 0 || bodyHeight - TOAST_PILL_HEIGHT < 8) {
    if (radius <= 0) {
      return [
        'M 0,0',
        `H ${safePillWidth}`,
        `V ${TOAST_PILL_HEIGHT}`,
        'H 0',
        'Z',
      ].join(' ');
    }

    return [
      `M 0,${radius}`,
      `A ${radius},${radius} 0 0 1 ${radius},0`,
      `H ${safePillWidth - radius}`,
      `A ${radius},${radius} 0 0 1 ${safePillWidth},${radius}`,
      `A ${radius},${radius} 0 0 1 ${safePillWidth - radius},${TOAST_PILL_HEIGHT}`,
      `H ${radius}`,
      `A ${radius},${radius} 0 0 1 0,${radius}`,
      'Z',
    ].join(' ');
  }

  const curve = 14 * progress;
  const bodyWidthInterpolated = safePillWidth + (bodyWidth - safePillWidth) * progress;
  const configuredBodyRadius = clamp(radii.body, 0, 32);
  const cornerRadius = Math.max(
    0,
    Math.min(configuredBodyRadius, (bodyHeight - TOAST_PILL_HEIGHT) * 0.45, bodyWidthInterpolated / 2)
  );
  const lateralExpansion = bodyWidthInterpolated - safePillWidth;
  const topRightRadius = Math.max(0, Math.min(cornerRadius, lateralExpansion));
  const bodyTop = TOAST_PILL_HEIGHT - curve;
  const qEndX = Math.min(safePillWidth + curve, bodyWidthInterpolated - topRightRadius);

  const pillTopCommands = radius > 0
    ? [
      `M 0,${radius}`,
      `A ${radius},${radius} 0 0 1 ${radius},0`,
      `H ${safePillWidth - radius}`,
      `A ${radius},${radius} 0 0 1 ${safePillWidth},${radius}`,
    ]
    : [
      'M 0,0',
      `H ${safePillWidth}`,
    ];

  if (cornerRadius <= 0) {
    return [
      ...pillTopCommands,
      `L ${safePillWidth},${bodyTop}`,
      `Q ${safePillWidth},${bodyTop + curve} ${qEndX},${bodyTop + curve}`,
      `H ${bodyWidthInterpolated}`,
      `L ${bodyWidthInterpolated},${bodyHeight}`,
      'H 0',
      'Z',
    ].join(' ');
  }

  return [
    ...pillTopCommands,
    `L ${safePillWidth},${bodyTop}`,
    `Q ${safePillWidth},${bodyTop + curve} ${qEndX},${bodyTop + curve}`,
    `H ${bodyWidthInterpolated - topRightRadius}`,
    `A ${topRightRadius},${topRightRadius} 0 0 1 ${bodyWidthInterpolated},${bodyTop + curve + topRightRadius}`,
    `L ${bodyWidthInterpolated},${bodyHeight - cornerRadius}`,
    `A ${cornerRadius},${cornerRadius} 0 0 1 ${bodyWidthInterpolated - cornerRadius},${bodyHeight}`,
    `H ${cornerRadius}`,
    `A ${cornerRadius},${cornerRadius} 0 0 1 0,${bodyHeight - cornerRadius}`,
    'Z',
  ].join(' ');
}

export function morphPathCenter(
  pillWidth: number,
  bodyWidth: number,
  totalHeight: number,
  progress: number,
  radii: GoeyMorphRadii = DEFAULT_MORPH_RADII
): string {
  const safePillWidth = Math.min(pillWidth, bodyWidth);
  const radius = Math.min(clamp(radii.pill, 0, TOAST_PILL_HEIGHT / 2), safePillWidth / 2);
  const pillOffset = (bodyWidth - safePillWidth) / 2;

  if (progress <= 0 || (totalHeight - TOAST_PILL_HEIGHT) * progress < 8) {
    if (radius <= 0) {
      return [
        `M ${pillOffset},0`,
        `H ${pillOffset + safePillWidth}`,
        `V ${TOAST_PILL_HEIGHT}`,
        `H ${pillOffset}`,
        'Z',
      ].join(' ');
    }

    return [
      `M ${pillOffset},${radius}`,
      `A ${radius},${radius} 0 0 1 ${pillOffset + radius},0`,
      `H ${pillOffset + safePillWidth - radius}`,
      `A ${radius},${radius} 0 0 1 ${pillOffset + safePillWidth},${radius}`,
      `A ${radius},${radius} 0 0 1 ${pillOffset + safePillWidth - radius},${TOAST_PILL_HEIGHT}`,
      `H ${pillOffset + radius}`,
      `A ${radius},${radius} 0 0 1 ${pillOffset},${radius}`,
      'Z',
    ].join(' ');
  }

  const bodyHeight = TOAST_PILL_HEIGHT + (totalHeight - TOAST_PILL_HEIGHT) * progress;
  const curve = 14 * progress;
  const bodyWidthInterpolated = safePillWidth + (bodyWidth - safePillWidth) * progress;
  const configuredBodyRadius = clamp(radii.body, 0, 32);
  const cornerRadius = Math.max(
    0,
    Math.min(configuredBodyRadius, (bodyHeight - TOAST_PILL_HEIGHT) * 0.45, bodyWidthInterpolated / 2)
  );
  const lateralExpansion = (bodyWidthInterpolated - safePillWidth) / 2;
  const topCornerRadius = Math.max(0, Math.min(cornerRadius, lateralExpansion));
  const bodyTop = TOAST_PILL_HEIGHT - curve;
  const bodyCenter = bodyWidth / 2;
  const halfWidth = bodyWidthInterpolated / 2;
  const bodyLeft = bodyCenter - halfWidth;
  const bodyRight = bodyCenter + halfWidth;
  const qLeftX = Math.max(bodyLeft + topCornerRadius, pillOffset - curve);
  const qRightX = Math.min(bodyRight - topCornerRadius, pillOffset + safePillWidth + curve);

  const pillTopCommands = radius > 0
    ? [
      `M ${pillOffset},${radius}`,
      `A ${radius},${radius} 0 0 1 ${pillOffset + radius},0`,
      `H ${pillOffset + safePillWidth - radius}`,
      `A ${radius},${radius} 0 0 1 ${pillOffset + safePillWidth},${radius}`,
    ]
    : [
      `M ${pillOffset},0`,
      `H ${pillOffset + safePillWidth}`,
    ];

  if (cornerRadius <= 0) {
    return [
      ...pillTopCommands,
      `L ${pillOffset + safePillWidth},${bodyTop}`,
      `Q ${pillOffset + safePillWidth},${bodyTop + curve} ${qRightX},${bodyTop + curve}`,
      `H ${bodyRight}`,
      `L ${bodyRight},${bodyHeight}`,
      `H ${bodyLeft}`,
      `L ${bodyLeft},${bodyTop + curve}`,
      `H ${qLeftX}`,
      `Q ${pillOffset},${bodyTop + curve} ${pillOffset},${bodyTop}`,
      'Z',
    ].join(' ');
  }

  return [
    ...pillTopCommands,
    `L ${pillOffset + safePillWidth},${bodyTop}`,
    `Q ${pillOffset + safePillWidth},${bodyTop + curve} ${qRightX},${bodyTop + curve}`,
    `H ${bodyRight - topCornerRadius}`,
    `A ${topCornerRadius},${topCornerRadius} 0 0 1 ${bodyRight},${bodyTop + curve + topCornerRadius}`,
    `L ${bodyRight},${bodyHeight - cornerRadius}`,
    `A ${cornerRadius},${cornerRadius} 0 0 1 ${bodyRight - cornerRadius},${bodyHeight}`,
    `H ${bodyLeft + cornerRadius}`,
    `A ${cornerRadius},${cornerRadius} 0 0 1 ${bodyLeft},${bodyHeight - cornerRadius}`,
    `L ${bodyLeft},${bodyTop + curve + topCornerRadius}`,
    `A ${topCornerRadius},${topCornerRadius} 0 0 1 ${bodyLeft + topCornerRadius},${bodyTop + curve}`,
    `H ${qLeftX}`,
    `Q ${pillOffset},${bodyTop + curve} ${pillOffset},${bodyTop}`,
    'Z',
  ].join(' ');
}
