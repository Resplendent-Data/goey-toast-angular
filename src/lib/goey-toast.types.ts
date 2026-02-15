export type GoeyToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading';

export type GoeyToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface GoeyToastAction {
  label: string;
  onClick: () => void;
  successLabel?: string;
}

export interface GoeyToastOptions {
  id?: string;
  description?: string;
  duration?: number;
  action?: GoeyToastAction;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  spring?: boolean;
  bounce?: number; // 0.05 - 0.8
}

export interface GoeyToastItem extends Required<Pick<GoeyToastOptions, 'spring' | 'bounce'>> {
  id: string;
  type: GoeyToastType;
  title: string;
  description?: string;
  duration: number;
  action?: GoeyToastAction;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  state: 'open' | 'closing';
}

export interface GoeyPromiseData<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((err: unknown) => string);
}
