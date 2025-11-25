import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OscillatorComponent } from './oscillator.component';

describe('OscillatorModule', () => {
  let component: OscillatorComponent;
  let fixture: ComponentFixture<OscillatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OscillatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OscillatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
