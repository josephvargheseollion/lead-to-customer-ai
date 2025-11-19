import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sankey } from './sankey';

describe('Sankey', () => {
  let component: Sankey;
  let fixture: ComponentFixture<Sankey>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sankey]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sankey);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
