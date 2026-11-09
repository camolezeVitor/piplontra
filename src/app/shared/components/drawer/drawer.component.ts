import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { drawerVariants } from './drawer-variants';

@Component({
  selector: 'pip-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
})
export class DrawerComponent {
  @Input() open = false;

  @HostBinding('class')
  get hostClass() {
    return drawerVariants({ open: this.open });
  }
}