import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExecutiveReport } from '../ExecutiveReport'

// Mock next-intl hook
jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      'title': 'Executive AI Report',
      'cloud': 'Cloud (Gemini)',
      'offline': 'Offline (Gemma4:26b)',
      'generate': 'Generate Executive Summary'
    };
    return messages[key] || key;
  }
}))

// Mock react-markdown
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}), { virtual: true })

describe('ExecutiveReport Component', () => {
  const mockSimulationData = {
    simulation_scenario: {
      scenario_id: 'test-1',
      campaign_input: {
        campaign_id: 'c-1',
        channel_names: ['search'],
        date_range: { start_date: '2026-01-01', end_date: '2026-01-31' },
        target_audience: { demographics: {}, interests: [] },
        region: 'BD',
        allocations: [{ channel_name: 'search', spend: 1000 }]
      },
      competitor_signals: []
    },
    optimization_result: {
      campaign_id: 'c-1',
      optimized_allocations: [{ channel_name: 'search', spend: 1200 }],
      expected_forecast: {
        campaign_id: 'c-1',
        estimated_revenue: 5000,
        uncertainty_bounds: { lower_bound: 4000, upper_bound: 6000, confidence_level: 0.95 }
      },
      recommendations: []
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders the component headers and toggles successfully', () => {
    render(<ExecutiveReport simulationData={mockSimulationData} />)
    
    expect(screen.getByText('Executive AI Report')).toBeInTheDocument()
    expect(screen.getByText('Cloud (Gemini)')).toBeInTheDocument()
    expect(screen.getByText('Offline (Gemma4:26b)')).toBeInTheDocument()
    expect(screen.getByText('Generate Executive Summary')).toBeInTheDocument()
  })

  it('calls fetch with stringified data when button is clicked', async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'Mocked text response'
    } as Response)

    render(<ExecutiveReport simulationData={mockSimulationData} />)
    
    const generateBtn = screen.getByText('Generate Executive Summary')
    fireEvent.click(generateBtn)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/report', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          simulationData: mockSimulationData,
          locale: 'en',
          provider: 'cloud'
        })
      }))
    })
    mockFetch.mockRestore();
  })

  it('renders markdown text when completion is populated', async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '### Mocked Summary\nHere is your data.'
    } as Response)

    render(<ExecutiveReport simulationData={mockSimulationData} />)
    
    const generateBtn = screen.getByText('Generate Executive Summary')
    fireEvent.click(generateBtn)

    expect(await screen.findByText(/Mocked Summary/i)).toBeInTheDocument()
    expect(await screen.findByText(/Here is your data/i)).toBeInTheDocument()
    mockFetch.mockRestore();
  })
})
