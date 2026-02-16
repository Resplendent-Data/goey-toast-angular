export type GoeyToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading';

export type GoeyToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type GoeyToastTheme = 'light' | 'dark';

export type GoeyToastOffset = number | string;
export type GoeyToastTypeColors = Partial<Record<GoeyToastType, string>>;

export interface GoeyToastRadius {
  pill?: number;
  body?: number;
  action?: GoeyToastOffset;
}

export interface GoeyToastAction {
  label: string;
  onClick: () => void;
  successLabel?: string;
}

export interface GoeyToastTimings {
  displayDuration?: number;
}

export interface GoeyToastClassNames {
  wrapper?: string;
  content?: string;
  header?: string;
  title?: string;
  icon?: string;
  description?: string;
  actionWrapper?: string;
  actionButton?: string;
}

export interface GoeyToastOptions {
  id?: string;
  description?: string;
  duration?: number;
  action?: GoeyToastAction;
  classNames?: GoeyToastClassNames;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  typeColors?: GoeyToastTypeColors;
  radius?: GoeyToastRadius;
  timing?: GoeyToastTimings;
  spring?: boolean;
  bounce?: number; // 0.05 - 0.8
}

export interface GoeyToasterDefaults extends Omit<GoeyToastOptions, 'id'> {
  duration: number;
  spring: boolean;
  bounce: number;
}

export interface GoeyToastItem extends Required<Pick<GoeyToastOptions, 'spring' | 'bounce'>> {
  id: string;
  type: GoeyToastType;
  title: string;
  description?: string;
  duration: number;
  action?: GoeyToastAction;
  classNames?: GoeyToastClassNames;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  typeColors?: GoeyToastTypeColors;
  radius?: GoeyToastRadius;
  timing?: GoeyToastTimings;
  state: 'open' | 'closing';
}

export interface GoeyPromiseData<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((err: unknown) => string);
  description?: {
    loading?: string;
    success?: string | ((data: T) => string);
    error?: string | ((err: unknown) => string);
  };
  action?: {
    success?: GoeyToastAction;
    error?: GoeyToastAction;
  };
  classNames?: GoeyToastClassNames;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  typeColors?: GoeyToastTypeColors;
  radius?: GoeyToastRadius;
  timing?: GoeyToastTimings;
  spring?: boolean;
  bounce?: number;
}
