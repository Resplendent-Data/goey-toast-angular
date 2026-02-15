import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GoeyToastService } from './goey-toast.service';
import { GoeyToastItem, GoeyToastPosition } from './goey-toast.types';

@Component({
  selector: 'goey-toaster',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './goey-toaster.component.html',
  styleUrl: './goey-toaster.component.css',
})
export class GoeyToasterComponent {
  @Input() position: GoeyToastPosition = 'bottom-right';

  private readonly service = inject(GoeyToastService);
  readonly toasts$: Observable<GoeyToastItem[]> = this.service.toasts$;

  dismiss(id: string) {
    this.service.dismiss(id);
  }

  runAction(toast: GoeyToastItem) {
    toast.action?.onClick?.();
    if (toast.action?.successLabel) {
      const original = toast.action.label;
      toast.action.label = toast.action.successLabel;
      setTimeout(() => (toast.action!.label = original), 1300);
    }
  }

  typeClass(type: GoeyToastItem['type']) {
    return `goey-${type}`;
  }

  trackById(_: number, toast: GoeyToastItem) {
    return toast.id;
  }
}
