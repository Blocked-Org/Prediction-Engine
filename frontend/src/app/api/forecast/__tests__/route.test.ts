/**
 * @jest-environment node
 */
import { GET } from '../route'

describe('Forecast API Mock', () => {
  it('should return a 200 JSON response with simulation_scenario and optimization_result', async () => {
    const response = await GET()
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('simulation_scenario')
    expect(data).toHaveProperty('optimization_result')
    
    expect(data.simulation_scenario.scenario_id).toBe('sim_001')
    expect(data.optimization_result.expected_forecast.estimated_revenue).toBe(250000.0)
  })
})
