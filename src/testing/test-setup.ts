import 'zone.js/node';

import { TestBed } from '@angular/core/testing';
import '@angular/compiler';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

(() => {
  try {
    TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  } catch {
    if (typeof TestBed.resetTestEnvironment === 'function') {
      TestBed.resetTestEnvironment();
    }
    TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  }
})();
