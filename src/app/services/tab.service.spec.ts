import {TestBed} from '@angular/core/testing';

import {TabDataService} from './tab-data.service';

describe('RepoCacheService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TabDataService = TestBed.get(TabDataService);
    expect(service).toBeTruthy();
  });
});
