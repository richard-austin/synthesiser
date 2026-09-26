import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigFileComponent } from './config-file.component';

describe('OptionsComponent', () => {
  let component: ConfigFileComponent;
  let fixture: ComponentFixture<ConfigFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigFileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigFileComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
