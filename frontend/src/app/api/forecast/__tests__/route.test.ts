/**
 * @jest-environment node
 */
import { GET } from "../route";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

const mockAuth = jest.requireMock("@clerk/nextjs/server").auth as jest.Mock;

describe("Forecast API GET (dashboard proxy)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns dashboard payload when backend is ready", async () => {
    mockAuth.mockResolvedValue({ userId: "user_test" });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ready",
        simulation_scenario: { scenario_id: "sim_abc" },
        optimization_result: {
          expected_forecast: { estimated_revenue: 120000 },
        },
      }),
    });

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.simulation_scenario.scenario_id).toBe("sim_abc");
    expect(data.optimization_result.expected_forecast.estimated_revenue).toBe(
      120000
    );
  });
});
