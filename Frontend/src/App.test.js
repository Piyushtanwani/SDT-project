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
});
