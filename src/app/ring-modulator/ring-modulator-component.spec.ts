import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RingModulatorComponent } from './ring-modulator-component';

describe('RingModulatorComponent', () => {
  let component: RingModulatorComponent;
  let fixture: ComponentFixture<RingModulatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RingModulatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RingModulatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
