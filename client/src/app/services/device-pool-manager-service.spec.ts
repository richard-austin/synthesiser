import { TestBed } from '@angular/core/testing';

import { DevicePoolManagerService } from './device-pool-manager-service';

describe('DevicePoolManagerService', () => {
  let service: DevicePoolManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DevicePoolManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
