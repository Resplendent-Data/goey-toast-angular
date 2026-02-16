import { ChangeDetectionStrategy, Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
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
export class GoeyToasterComponent implements OnInit, OnChanges {
  @Input() position: GoeyToastPosition = 'bottom-right';
  @Input() theme: GoeyToastTheme = 'light';
  @Input() gap: number = 14;
  @Input() offset: GoeyToastOffset = 24;
  @Input() spring = true;
  @Input() bounce = 0.4;

  private readonly service = inject(GoeyToastService);

  readonly toasts = toSignal(this.service.toasts$, { initialValue: [] });

  ngOnInit(): void {
    this.syncAnimationDefaults();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['spring'] || changes['bounce']) {
      this.syncAnimationDefaults();
    }
  }

  gapStyle(): string {
    return toCssLength(this.gap);
  }

  offsetStyle(): string {
    return toCssLength(this.offset);
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
