import { TestBed } from '@angular/core/testing';

import { JourneyState } from './journey-state';

describe('JourneyState', () => {
  let service: JourneyState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JourneyState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
