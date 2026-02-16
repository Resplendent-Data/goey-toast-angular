import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GoeyPromiseData, GoeyToastItem, GoeyToastOptions, GoeyToastType, GoeyToasterDefaults } from './goey-toast.types';

@Injectable({ providedIn: 'root' })
export class GoeyToastService {
  private readonly _toasts = new BehaviorSubject<GoeyToastItem[]>([]);
  readonly toasts$ = this._toasts.asObservable();

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly closingMs = 220;

  private defaults: GoeyToasterDefaults = {
    duration: 4000,
    spring: true,
    bounce: 0.4,
  };

  setDefaults(defaults: Partial<GoeyToasterDefaults>) {
    this.defaults = { ...this.defaults, ...defaults };
  }

  show(title: string, options: GoeyToastOptions = {}, type: GoeyToastType = 'default'): string {
    const id = options.id ?? this.makeId();
    const item: GoeyToastItem = {
      id,
      title,
      type,
      description: options.description,
      duration: options.duration ?? this.defaults.duration,
      action: options.action,
      classNames: options.classNames,
      fillColor: options.fillColor,
      borderColor: options.borderColor,
      borderWidth: options.borderWidth,
      timing: options.timing,
      spring: options.spring ?? this.defaults.spring,
      bounce: options.bounce ?? this.defaults.bounce,
      state: 'open',
    };

    this._toasts.next([item, ...this._toasts.value.filter((toast) => toast.id !== id)]);
    this.armDismissTimer(item);

    return id;
  }

  success(title: string, options?: GoeyToastOptions) {
    return this.show(title, options, 'success');
  }

  error(title: string, options?: GoeyToastOptions) {
    return this.show(title, options, 'error');
  }

  warning(title: string, options?: GoeyToastOptions) {
    return this.show(title, options, 'warning');
  }

  info(title: string, options?: GoeyToastOptions) {
    return this.show(title, options, 'info');
  }

  loading(title: string, options?: GoeyToastOptions) {
    return this.show(title, { ...options, duration: 0 }, 'loading');
  }

  update(id: string, patch: Partial<Omit<GoeyToastItem, 'id'>>) {
    let updatedToast: GoeyToastItem | undefined;
    this._toasts.next(
      this._toasts.value.map((toast) => {
        if (toast.id !== id) {
          return toast;
        }

        updatedToast = { ...toast, ...patch };
        return updatedToast;
      })
    );

    if (updatedToast) {
      this.armDismissTimer(updatedToast);
    }
  }

  dismiss(id?: string) {
    if (!id) {
      this._toasts.value.forEach((t) => this.clearTimer(t.id));
      this._toasts.next([]);
      return;
    }

    this.clearTimer(id);

    const next = this._toasts.value.map((t) =>
      t.id === id ? { ...t, state: 'closing' as const } : t
    );
    this._toasts.next(next);

    setTimeout(() => {
      this._toasts.next(this._toasts.value.filter((t) => t.id !== id));
    }, this.closingMs);
  }

  async promise<T>(promise: Promise<T>, data: GoeyPromiseData<T>, options?: GoeyToastOptions): Promise<T> {
    const id = this.loading(data.loading, {
      ...options,
      description: this.resolveMaybeMessage(data.description?.loading),
      classNames: data.classNames ?? options?.classNames,
      fillColor: data.fillColor ?? options?.fillColor,
      borderColor: data.borderColor ?? options?.borderColor,
      borderWidth: data.borderWidth ?? options?.borderWidth,
      timing: data.timing ?? options?.timing,
      spring: data.spring ?? options?.spring,
      bounce: data.bounce ?? options?.bounce,
    });

    try {
      const result = await promise;

      this.update(id, {
        title: this.resolveMessage(data.success, result),
        type: 'success',
        description: this.resolveMaybeMessage(data.description?.success, result),
        action: data.action?.success,
        duration: options?.duration ?? this.defaults.duration,
        classNames: data.classNames ?? options?.classNames,
        fillColor: data.fillColor ?? options?.fillColor,
        borderColor: data.borderColor ?? options?.borderColor,
        borderWidth: data.borderWidth ?? options?.borderWidth,
        timing: data.timing ?? options?.timing,
        spring: data.spring ?? options?.spring ?? this.defaults.spring,
        bounce: data.bounce ?? options?.bounce ?? this.defaults.bounce,
        state: 'open',
      });

      return result;
    } catch (err) {
      this.update(id, {
        title: this.resolveMessage(data.error, err),
        type: 'error',
        description: this.resolveMaybeMessage(data.description?.error, err),
        action: data.action?.error,
        duration: options?.duration ?? this.defaults.duration,
        classNames: data.classNames ?? options?.classNames,
        fillColor: data.fillColor ?? options?.fillColor,
        borderColor: data.borderColor ?? options?.borderColor,
        borderWidth: data.borderWidth ?? options?.borderWidth,
        timing: data.timing ?? options?.timing,
        spring: data.spring ?? options?.spring ?? this.defaults.spring,
        bounce: data.bounce ?? options?.bounce ?? this.defaults.bounce,
        state: 'open',
      });

      throw err;
    }
  }

  private armDismissTimer(toast: GoeyToastItem) {
    this.clearTimer(toast.id);

    if (!this.shouldAutoDismiss(toast)) {
      return;
    }

    this.timers.set(
      toast.id,
      setTimeout(() => this.dismiss(toast.id), toast.duration)
    );
  }

  private shouldAutoDismiss(toast: GoeyToastItem) {
    if (toast.state === 'closing') {
      return false;
    }

    if (toast.duration <= 0 || toast.type === 'loading') {
      return false;
    }

    const hasExpandedBody = Boolean(toast.description || toast.action);
    return !hasExpandedBody;
  }

  private resolveMessage<T>(value: string | ((input: T) => string), input: T): string {
    if (typeof value === 'function') {
      return value(input);
    }

    return value;
  }

  private resolveMaybeMessage<T>(
    value: string | ((input: T) => string) | undefined,
    input?: T
  ): string | undefined {
    if (typeof value === 'undefined') {
      return undefined;
    }

    if (typeof value === 'function') {
      return value(input as T);
    }

    return value;
  }

  private clearTimer(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  private makeId() {
    return `goey-${Math.random().toString(36).slice(2, 10)}`;
  }
}
