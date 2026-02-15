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
      fillColor: options.fillColor,
      borderColor: options.borderColor,
      borderWidth: options.borderWidth,
      spring: options.spring ?? this.defaults.spring,
      bounce: options.bounce ?? this.defaults.bounce,
      state: 'open',
    };

    this._toasts.next([item, ...this._toasts.value]);

    if (item.duration > 0 && type !== 'loading') {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), item.duration)
      );
    }

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
    this._toasts.next(this._toasts.value.map((t) => (t.id === id ? { ...t, ...patch } : t)));
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
    const id = this.loading(data.loading, options);
    try {
      const result = await promise;
      this.dismiss(id);
      this.success(typeof data.success === 'function' ? data.success(result) : data.success, options);
      return result;
    } catch (err) {
      this.dismiss(id);
      this.error(typeof data.error === 'function' ? data.error(err) : data.error, options);
      throw err;
    }
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
