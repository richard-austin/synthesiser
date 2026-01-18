import { TestBed } from '@angular/core/testing';

import { RestfulApiService } from './restful-api.service';

describe('REstfulAPIService', () => {
  let service: RestfulApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RestfulApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
