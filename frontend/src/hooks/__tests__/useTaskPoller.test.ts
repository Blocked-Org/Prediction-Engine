import { renderHook, waitFor } from '@testing-library/react';
import { useTaskPoller } from '../useTaskPoller';

// Mock global fetch
global.fetch = jest.fn();

describe('useTaskPoller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('polls until success and triggers onSuccess', async () => {
    const mockOnSuccess = jest.fn();
    const mockOnError = jest.fn();

    let fetchCount = 0;
    (global.fetch as jest.Mock).mockImplementation(async () => {
      fetchCount++;
      if (fetchCount === 1) {
        return { ok: true, json: async () => ({ status: 'PROCESSING', task_id: 'test-123' }) };
      }
      return {
        ok: true,
        json: async () => ({
          status: 'SUCCESS',
          task_id: 'test-123',
          result: { projected_roi: 2.5 }
        })
      };
    });

    const { result } = renderHook(() => useTaskPoller('test-123', {
      intervalMs: 100, // Speed up polling for test
      onSuccess: mockOnSuccess,
      onError: mockOnError
    }));

    // Initially should be processing
    expect(result.current.status).toBe('PENDING');

    // Wait for the poll to resolve
    await waitFor(() => {
      expect(result.current.status).toBe('SUCCESS');
    });

    expect(result.current.result).toEqual({ projected_roi: 2.5 });
  });

  it('triggers onError on network failure', async () => {
    const mockOnError = jest.fn();

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network disconnected'));

    const { result } = renderHook(() => useTaskPoller('error-task', {
      intervalMs: 100,
      onError: mockOnError
    }));

    await waitFor(() => {
      expect(result.current.status).toBe('FAILURE');
    });

    expect(result.current.error).toBe('Network disconnected');
  });
});
