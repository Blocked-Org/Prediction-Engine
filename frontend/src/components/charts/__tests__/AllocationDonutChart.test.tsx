import { render, screen } from '@testing-library/react'
import { AllocationDonutChart } from '../AllocationDonutChart'

// Mock react-chartjs-2 to avoid canvas issues in JSDOM
jest.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="mock-doughnut-chart" />
}))

describe('AllocationDonutChart', () => {
  it('renders the chart without crashing', () => {
    const mockAllocations = [
      { channel_name: 'Search', spend: 1000 },
      { channel_name: 'Social', spend: 2000 }
    ]
    render(<AllocationDonutChart allocations={mockAllocations} />)
    
    // Assert the mocked chart component is mounted
    expect(screen.getByTestId('mock-doughnut-chart')).toBeInTheDocument()
  })
})
