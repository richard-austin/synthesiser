import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SynthComponent } from './synth-component';

describe('SynthComponent', () => {
  let component: SynthComponent;
  let fixture: ComponentFixture<SynthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SynthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SynthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
