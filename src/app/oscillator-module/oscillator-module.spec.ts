import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OscillatorModule } from './oscillator-module';

describe('OscillatorModule', () => {
  let component: OscillatorModule;
  let fixture: ComponentFixture<OscillatorModule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OscillatorModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OscillatorModule);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
