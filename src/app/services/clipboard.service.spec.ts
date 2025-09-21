import {TestBed} from '@angular/core/testing';

import {ClipboardService} from './clipboard.service';

describe('ClipboardService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ClipboardService = TestBed.inject(ClipboardService);
    expect(service).toBeTruthy();
  });
});
