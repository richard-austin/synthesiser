import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatrixControlComponent } from './matrix-control-component';

describe('MatrixControlComponent', () => {
  let component: MatrixControlComponent;
  let fixture: ComponentFixture<MatrixControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrixControlComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MatrixControlComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
