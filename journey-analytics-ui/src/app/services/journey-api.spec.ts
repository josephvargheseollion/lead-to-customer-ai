import { TestBed } from '@angular/core/testing';

import { JourneyApi } from './journey-api';

describe('JourneyApi', () => {
  let service: JourneyApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JourneyApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
