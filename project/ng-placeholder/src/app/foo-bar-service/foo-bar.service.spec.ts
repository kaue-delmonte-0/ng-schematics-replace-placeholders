import { TestBed } from '@angular/core/testing';

import { FooBarService } from './foo-bar.service';

describe('FooBarService', () => {
  let service: FooBarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FooBarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
