import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  modals: { [key: string]: Subject<boolean> } = {};

  constructor() {
  }

  registerModal(key: string) {
    if (!this.modals[key]) {
      this.modals[key] = new Subject<boolean>();
    }
    return this.modals[key];
  }

  getSetVisibleListener(key: string) {
    return this.registerModal(key).asObservable();
  }

  setModalVisible(key: string, val: boolean) {
    if (this.modals[key]) {
      this.modals[key].next(val);
    }
  }
}
