import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WaveshaperComponent } from './waveshaper-component';

describe('WaveshaperComponent', () => {
  let component: WaveshaperComponent;
  let fixture: ComponentFixture<WaveshaperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaveshaperComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(WaveshaperComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
