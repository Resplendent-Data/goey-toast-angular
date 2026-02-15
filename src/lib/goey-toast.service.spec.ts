import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { describe, expect, it, vi } from 'vitest';
import { GoeyToastService } from './goey-toast.service';

describe('GoeyToastService', () => {
  it('adds a success toast', async () => {
    const service = new GoeyToastService();
    service.success('Saved');

    const toasts = await firstValueFrom(service.toasts$.pipe(take(1)));
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].title).toBe('Saved');
  });

  it('dismiss removes a toast after close animation delay', async () => {
    vi.useFakeTimers();
    const service = new GoeyToastService();
    const id = service.info('Heads up', { duration: 0 });

    service.dismiss(id);
    vi.advanceTimersByTime(250);

    const toasts = await firstValueFrom(service.toasts$.pipe(take(1)));
    expect(toasts.find((t) => t.id === id)).toBeUndefined();
    vi.useRealTimers();
  });

  it('promise resolves into success toast', async () => {
    const service = new GoeyToastService();
    await service.promise(Promise.resolve('ok'), {
      loading: 'Saving...',
      success: 'Done!',
      error: 'Failed',
    });

    const toasts = await firstValueFrom(service.toasts$.pipe(take(1)));
    expect(toasts.some((t) => t.type === 'success' && t.title === 'Done!')).toBe(true);
  });
});
