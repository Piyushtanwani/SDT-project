import { API_BASE_URL, getAuthHeaders } from './config/api';

describe('Frontend API Configuration & JWT Security', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('SEC-02: getAuthHeaders returns empty object when user is unauthenticated', () => {
    const headers = getAuthHeaders();
    expect(headers).toEqual({});
  });

  test('SEC-02: getAuthHeaders attaches Bearer token when authenticated', () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    sessionStorage.setItem('authToken', mockToken);

    const headers = getAuthHeaders();
    expect(headers).toEqual({
      Authorization: `Bearer ${mockToken}`,
    });
  });

  test('SEC-01: API_BASE_URL is defined and defaults safely', () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });

  // A bundle wired to a dev machine blanks every page once deployed — that is how the
  // live site lost its data, so the packaged path is pinned here rather than trusted.
  test('PKG-01: a packaged build never points at a development machine', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    let packagedBase;
    jest.isolateModules(() => {
      packagedBase = require('./config/api').API_BASE_URL;
    });
    process.env.NODE_ENV = originalNodeEnv;

    expect(packagedBase).toMatch(/^https:\/\//);
    expect(packagedBase).not.toMatch(/localhost|127\.0\.0\.1|:8080|:3000/);
  });
});
