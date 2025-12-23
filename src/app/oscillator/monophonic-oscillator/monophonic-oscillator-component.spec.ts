import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonophonicOscillatorComponent } from './monophonic-oscillator-component';

describe('MonophonicOscillatorComponent', () => {
  let component: MonophonicOscillatorComponent;
  let fixture: ComponentFixture<MonophonicOscillatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonophonicOscillatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonophonicOscillatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
