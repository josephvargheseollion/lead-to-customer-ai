import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Funnel } from './funnel';

describe('Funnel', () => {
  let component: Funnel;
  let fixture: ComponentFixture<Funnel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Funnel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Funnel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
