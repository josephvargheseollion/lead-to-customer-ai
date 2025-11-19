import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Markov } from './markov';

describe('Markov', () => {
  let component: Markov;
  let fixture: ComponentFixture<Markov>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Markov]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Markov);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
