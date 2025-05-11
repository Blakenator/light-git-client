import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  modals: { [key: string]: BehaviorSubject<boolean> } = {};

  constructor() {}

  registerModal(key: string) {
    if (!this.modals[key]) {
      this.modals[key] = new BehaviorSubject<boolean>(false);
    }
    return this.modals[key];
  }

  getSetVisibleListener(key: string) {
    return this.registerModal(key);
  }

  setModalVisible(key: string, val: boolean) {
    if (this.modals[key]) {
      this.modals[key].next(val);
    }
  }
}
