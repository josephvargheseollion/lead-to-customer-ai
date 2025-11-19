import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Lengths } from './lengths';

describe('Lengths', () => {
  let component: Lengths;
  let fixture: ComponentFixture<Lengths>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Lengths]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Lengths);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
