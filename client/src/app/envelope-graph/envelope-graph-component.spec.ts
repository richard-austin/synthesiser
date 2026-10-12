import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnvelopeGraphComponent } from './envelope-graph-component';

describe('EnvelopeGraphComponent', () => {
  let component: EnvelopeGraphComponent;
  let fixture: ComponentFixture<EnvelopeGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvelopeGraphComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(EnvelopeGraphComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
