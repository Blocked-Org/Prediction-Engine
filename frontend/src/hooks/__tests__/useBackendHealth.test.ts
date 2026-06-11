import { renderHook, waitFor } from '@testing-library/react';
import { useBackendHealth } from '../useBackendHealth';

// Mock global fetch
global.fetch = jest.fn();

describe('useBackendHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initially checks health and returns healthy status', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'ok',
        services: { neo4j: 'ok', redis: 'ok' }
      })
    });

    const { result } = renderHook(() => useBackendHealth());

    expect(result.current.checking).toBe(true);
    
    await waitFor(() => {
      expect(result.current.checking).toBe(false);
    });

    expect(result.current.healthy).toBe(true);
    expect(result.current.services).toEqual({ neo4j: 'ok', redis: 'ok' });
  });

  it('reports degraded status if fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('503 Service Unavailable'));

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() => {
      expect(result.current.checking).toBe(false);
    });

    expect(result.current.healthy).toBe(false);
    expect(result.current.services).toEqual({});
  });
});
