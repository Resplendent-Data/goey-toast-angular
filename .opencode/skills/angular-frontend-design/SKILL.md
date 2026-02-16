---
name: angular-frontend-design
description: Create distinctive, production-grade Angular interfaces with high design quality. Use when building Angular components, pages, dashboards, or styling any Angular UI. Generates creative, polished Angular code that avoids generic AI aesthetics. Applies to Angular 19+ with standalone components, signals, and modern patterns.
---

# Angular Frontend Design

Create distinctive, production-grade Angular interfaces that avoid generic "AI slop" aesthetics. Implement real working Angular components with exceptional attention to aesthetic details and creative choices.

**Prerequisites**: This skill builds on conventions in AGENTS.md. All code must follow those patterns.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc.
- **Constraints**: Technical requirements, accessibility, performance
- **Differentiation**: What makes this UNFORGETTABLE?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work—the key is intentionality, not intensity.

---

## Angular Component Structure

Use Angular 19+ patterns per AGENTS.md:

```typescript
// 1. Angular core imports
import { Component, ChangeDetectionStrategy, inject, signal, computed, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
// 2. Third-party libraries
import { NbCardModule, NbButtonModule, NbIconModule } from '@nebular/theme';
import { Store } from '@ngxs/store';
// 3. App/root imports
import { BaseComponent } from '@core-components/base-component/base.component';
import { MyService } from '@services/my.service';
// 4. Relative imports
import { LocalModel } from './local.model';

@Component({
  selector: 'resplendent-feature-name',
  imports: [CommonModule, NbCardModule, NbButtonModule],
  template: `
    @if (isLoading()) {
      <div class="loading-state">...</div>
    } @else {
      <div class="feature-container">...</div>
    }
  `,
  styleUrl: './feature-name.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureNameComponent {
  private readonly service = inject(MyService);

  // Signal-based state
  isLoading = signal(false);
  items = signal<Item[]>([]);

  // Computed signals for derived state
  itemCount = computed(() => this.items().length);

  // Signal inputs
  config = input.required<Config>();
  theme = input<'light' | 'dark'>('light');
}
```

### Required Patterns (from AGENTS.md)

| Pattern         | Requirement                                                             |
| --------------- | ----------------------------------------------------------------------- |
| Components      | Standalone only (implicit in Angular 19, do NOT add `standalone: true`) |
| Selectors       | `resplendent-` prefix, kebab-case                                       |
| DI              | `inject()` function, never constructor injection                        |
| Control flow    | `@if`, `@for`, `@switch` (NEVER `*ngIf`, `*ngFor`)                      |
| Inputs          | `input.required<T>()`, `input<T>()` for optional                        |
| Two-way binding | `model<T>()`                                                            |
| Local state     | Signals with `signal()` and `computed()`                                |
| TypeScript      | `any` is forbidden—use strict types everywhere                          |

### BaseComponent Usage

Extend `BaseComponent` ONLY for components with complex async flows:

```typescript
// Extend BaseComponent when:
// - Manual subscription management with takeUntil(this.isDestroyed$)
// - Heavy NGXS/store integration with rsActionResponse patterns
// - Multiple combined observables requiring explicit teardown

export class ComplexComponent extends BaseComponent {
  private store = inject(Store);
  private actions$ = inject(Actions);
  private eventQueue = inject(EventQueueService);

  saveData(data: SaveData) {
    this.store
      .dispatch(new Action.Save(data))
      .pipe(
        rsActionResponse(this.actions$, Action.SaveSuccess, Action.SaveFail, {
          onSuccess: () => showSuccess(this.eventQueue, 'Saved!'),
          onFail: (err) => showError(this.eventQueue, err.message),
        }),
        takeUntil(this.isDestroyed$),
      )
      .subscribe();
  }
}

// DO NOT extend BaseComponent when:
// - Using async pipes: @if (user$ | async; as user) { ... }
// - Using toSignal() for observable-to-signal conversion
// - Simple signal-based state management
```

---

## Frontend Aesthetics Guidelines

### Typography

**Note**: This project uses a global font defined in the theme. Do not override `font-family`—focus on `font-size`, `font-weight`, `letter-spacing`, and `line-height` for typographic hierarchy.

```scss
.hero-title {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.body-text {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-hint-color);
}
```

### Color & Theme

Use CSS variables with semantic naming:

```scss
:host {
  // Semantic color variables (preferred)
  --text-primary: var(--text-basic-color);
  --text-secondary: var(--text-hint-color);
  --surface-primary: var(--background-basic-color-1);
  --surface-elevated: var(--background-basic-color-2);

  // Custom accent colors for this component
  --accent-primary: #ff6b35;
  --accent-secondary: #00d4aa;

  // Semantic shadows
  --shadow-elevated: 0 8px 32px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 40px rgba(255, 107, 53, 0.3);
}
```

**IMPORTANT**: Use semantic color variables like `--text-hint-color`, NOT raw tokens like `--color-basic-600`.

### Motion & Animations

Use CSS animations for high-impact moments:

```scss
// Staggered reveal animation
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fadeSlideUp 0.6s ease-out both;

  @for $i from 1 through 6 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.1}s;
    }
  }
}

// Micro-interactions
.action-button {
  transition:
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: var(--shadow-glow);
  }

  &:active {
    transform: scale(0.98);
  }
}
```

### Spatial Composition

Use unexpected layouts, asymmetry, and grid-breaking elements:

```scss
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: minmax(120px, auto);
  gap: 1.5rem;

  .hero-card {
    grid-column: 1 / 8;
    grid-row: 1 / 3;
  }

  .stat-card {
    grid-column: span 4;

    // Break the grid intentionally
    &.featured {
      grid-column: 8 / 13;
      margin-top: -2rem;
      z-index: 1;
    }
  }
}
```

### Backgrounds & Visual Details

Create atmosphere with gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, and grain overlays. Avoid solid color backgrounds.

---

## Nebular UI Integration

Use Nebular components (`nb-card`, `nb-button`) over raw HTML. Extend with custom styles:

```scss
// Override Nebular defaults with your theme
nb-card {
  background: var(--surface-elevated);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--border-radius-card);
  box-shadow: var(--shadow-elevated);

  nb-card-header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding: 1.5rem 2rem;
  }
}
```

### Border Radius Hierarchy (from AGENTS.md)

Nested elements must have smaller radius than container:

| Variable                | Value | Use             |
| ----------------------- | ----- | --------------- |
| `--border-radius-card`  | 12px  | Container cards |
| `--border-radius-inner` | 8px   | Inner sections  |
| `--border-radius-sm`    | 6px   | Small elements  |
| `--border-radius`       | 4px   | Buttons, inputs |

---

## Forms (Strictly Typed)

Define interfaces for form structures. Use centralized validators from `@helpers/form-helpers.ts`:

```typescript
interface MetricFormControls {
  name: FormControl<string>;
  value: FormControl<number>;
  unit: FormControl<string>;
}

@Component({...})
export class MetricFormComponent {
  form = new FormGroup<MetricFormControls>({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    value: new FormControl(0, { nonNullable: true }),
    unit: new FormControl('', { nonNullable: true }),
  });
}
```

---

## Anti-Patterns to Avoid

### Generic AI Aesthetics ❌

```scss
// NEVER use these clichéd patterns:
font-family: Inter, system-ui;
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
border-radius: 9999px;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
```

### AGENTS.md Violations ❌

```typescript
// Never use constructor injection
constructor(private service: MyService) {} // ❌
private service = inject(MyService); // ✅

// Never use legacy control flow
*ngIf="condition" // ❌
@if (condition) { } // ✅

// Never use any type
data: any // ❌
data: DataType // ✅
```

### Styling Violations ❌

```scss
// Never use ::ng-deep - use global styles.scss instead
::ng-deep .child-element {
} // ❌

// Never style raw tags - always use classes
h3 {
  font-size: 1.5rem;
} // ❌
.section-title {
  font-size: 1.5rem;
} // ✅

// Never use nb-theme() - use CSS variables
color: nb-theme('color-primary-500'); // ❌
color: var(--color-primary-default); // ✅

// Never use raw color tokens
color: var(--color-basic-600); // ❌
color: var(--text-hint-color); // ✅
```

---

## Complete Component Example

```typescript
import { Component, ChangeDetectionStrategy, inject, signal, computed, input, effect } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { NbCardModule, NbIconModule } from '@nebular/theme';

interface MetricTrend {
  value: number;
  direction: 'up' | 'down' | 'neutral';
}

@Component({
  selector: 'resplendent-metric-card',
  imports: [CommonModule, NbCardModule, NbIconModule, DecimalPipe],
  template: `
    <nb-card class="metric-card" [class.featured]="featured()">
      <nb-card-body>
        <div class="metric-icon">
          <nb-icon [icon]="icon()" pack="eva"></nb-icon>
        </div>
        <div class="metric-content">
          <span class="metric-value">{{ animatedValue() }}</span>
          <span class="metric-label">{{ label() }}</span>
        </div>
        @if (trend(); as t) {
          <div class="metric-trend" [class.positive]="t.direction === 'up'" [class.negative]="t.direction === 'down'">
            <nb-icon [icon]="t.direction === 'up' ? 'trending-up' : 'trending-down'" pack="eva"></nb-icon>
            <span>{{ t.value | number: '1.1-1' }}%</span>
          </div>
        }
      </nb-card-body>
    </nb-card>
  `,
  styleUrl: './metric-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCardComponent {
  // Signal inputs
  value = input.required<number>();
  label = input.required<string>();
  icon = input<string>('activity-outline');
  trend = input<MetricTrend | null>(null);
  featured = input(false);

  // Local state
  animatedValue = signal(0);

  constructor() {
    effect(() => {
      const target = this.value();
      this.animateValue(target);
    });
  }

  private animateValue(target: number): void {
    const duration = 800;
    const start = this.animatedValue();
    const startTime = performance.now();

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.animatedValue.set(Math.round(start + (target - start) * eased));

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }
}
```

```scss
// metric-card.component.scss - key patterns shown
:host {
  display: block;
}

.metric-card {
  background: var(--background-basic-color-2);
  border-radius: var(--border-radius-card);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
  }
  &.featured {
    background: linear-gradient(135deg, var(--background-basic-color-2) 0%, rgba(var(--color-primary-rgb), 0.1) 100%);
  }
}

.metric-value {
  color: var(--text-basic-color);
} // Semantic colors
.metric-label {
  color: var(--text-hint-color);
} // Not raw tokens
.metric-trend {
  &.positive {
    color: var(--color-success-default);
  }
  &.negative {
    color: var(--color-danger-default);
  }
}
```

---

## Summary

Remember: Claude is capable of extraordinary creative work. Don't hold back—show what can truly be created when embracing bold, original thinking and committing fully to a distinctive vision.

Match implementation complexity to the aesthetic vision:

- **Maximalist designs**: Elaborate code with extensive animations and effects
- **Minimalist designs**: Restraint, precision, careful spacing and typography

Every design should feel genuinely designed for its context. No two designs should be the same.
