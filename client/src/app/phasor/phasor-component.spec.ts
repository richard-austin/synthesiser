import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhasorComponent } from './phasor-component';

describe('PhasorComponent', () => {
  let component: PhasorComponent;
  let fixture: ComponentFixture<PhasorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhasorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhasorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
