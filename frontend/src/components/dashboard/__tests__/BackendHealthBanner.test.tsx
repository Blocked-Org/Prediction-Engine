import { render, screen, fireEvent } from '@testing-library/react';
import { BackendHealthBanner } from '../BackendHealthBanner';
import { useBackendHealth } from '@/hooks/useBackendHealth';

// Mock the hook
jest.mock('@/hooks/useBackendHealth', () => ({
  useBackendHealth: jest.fn(),
}));

// Mock the lucide-react icons
jest.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-icon" />,
  Database: () => <div data-testid="db-icon" />,
  Server: () => <div data-testid="server-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  X: () => <div data-testid="close-icon" />
}));

describe('BackendHealthBanner', () => {
  const mockUseBackendHealth = useBackendHealth as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when healthy', () => {
    mockUseBackendHealth.mockReturnValue({
      healthy: true,
      services: { neo4j: 'ok', redis: 'ok' },
      checking: false,
      refresh: jest.fn()
    });

    const { container } = render(<BackendHealthBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders when healthy is false', () => {
    mockUseBackendHealth.mockReturnValue({
      healthy: false,
      services: { neo4j: 'error', redis: 'ok' },
      checking: false,
      refresh: jest.fn()
    });

    render(<BackendHealthBanner />);
    expect(screen.getByText(/Backend degraded — services unreachable/i)).toBeInTheDocument();
  });

  it('renders general unreachable message if services are empty', () => {
    mockUseBackendHealth.mockReturnValue({
      healthy: false,
      services: {},
      checking: false,
      refresh: jest.fn()
    });

    render(<BackendHealthBanner />);
    expect(screen.getByText(/Backend is unreachable/i)).toBeInTheDocument();
  });

  it('allows dismissing the banner', () => {
    mockUseBackendHealth.mockReturnValue({
      healthy: false,
      services: {},
      checking: false,
      refresh: jest.fn()
    });

    render(<BackendHealthBanner />);
    
    expect(screen.getByText(/Backend is unreachable/i)).toBeInTheDocument();
    
    // Find close button
    const closeBtn = screen.getByRole('button', { name: /Dismiss/i });
    fireEvent.click(closeBtn);
    
    // Should be removed from DOM
    expect(screen.queryByText(/Backend is unreachable/i)).not.toBeInTheDocument();
  });

  it('calls refresh when retry is clicked', () => {
    const mockRefresh = jest.fn();
    mockUseBackendHealth.mockReturnValue({
      healthy: false,
      services: {},
      checking: false,
      refresh: mockRefresh
    });

    render(<BackendHealthBanner />);
    
    const retryBtn = screen.getByText(/Retry/i);
    fireEvent.click(retryBtn);
    
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
