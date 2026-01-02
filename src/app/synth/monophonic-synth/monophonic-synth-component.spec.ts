import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonophonicSynthComponent } from './monophonic-synth-component';

describe('MonophonicSynthComponent', () => {
  let component: MonophonicSynthComponent;
  let fixture: ComponentFixture<MonophonicSynthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonophonicSynthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonophonicSynthComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
