import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LevelControlComponent } from './level-control.component';

describe('LevelControl', () => {
  let component: LevelControlComponent;
  let fixture: ComponentFixture<LevelControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LevelControlComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LevelControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
