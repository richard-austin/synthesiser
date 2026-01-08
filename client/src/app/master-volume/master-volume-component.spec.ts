import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterVolumeComponent } from './master-volume-component';

describe('MasterVolumeComponent', () => {
  let component: MasterVolumeComponent;
  let fixture: ComponentFixture<MasterVolumeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterVolumeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterVolumeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
