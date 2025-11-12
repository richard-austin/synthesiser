import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LevelControl } from './level-control';

describe('LevelControl', () => {
  let component: LevelControl;
  let fixture: ComponentFixture<LevelControl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LevelControl]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LevelControl);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
