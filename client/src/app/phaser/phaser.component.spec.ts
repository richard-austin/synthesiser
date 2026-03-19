import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhaserComponent } from './phaser.component';

describe('PhasorComponent', () => {
  let component: PhaserComponent;
  let fixture: ComponentFixture<PhaserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhaserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhaserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
