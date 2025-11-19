import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopJourneys } from './top-journeys';

describe('TopJourneys', () => {
  let component: TopJourneys;
  let fixture: ComponentFixture<TopJourneys>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopJourneys]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopJourneys);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
