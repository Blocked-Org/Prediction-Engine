from pydantic import ValidationError

from src.api.schemas import SimulationRequest, SimulationResponse
from src.simulation.engine_runner import run_micro_simulation


def test_simulation_contract_validation():
    """
    Contract test to ensure the backend simulation engine outputs the exact JSON shape
    the frontend expects.
    """
    # 1. Create a realistic dummy instance of SimulationRequest
    dummy_request = SimulationRequest(
        Impressions=10000.0,
        Clicks=500,
        Spent=1000.0,
        Total_Conversion=50,
        age="25-29",
        gender="M",
        interest="Travel",
    )

    # 2. Pass the dummy request into run_micro_simulation
    output = run_micro_simulation(dummy_request)
    
    # If the output is a Pydantic model (as currently implemented), we convert it to a 
    # dictionary to simulate the raw JSON/dict return and test the unpacking.
    if isinstance(output, SimulationResponse):
        output_dict = output.model_dump()
    else:
        output_dict = output

    # 3. Take the output and unpack it into SimulationResponse(**output)
    # 4. Wrap the instantiation in a try/except block targeting pydantic.ValidationError
    try:
        validated_response = SimulationResponse(**output_dict)
        
        # Basic assertions to ensure we got the right type back
        assert isinstance(validated_response, SimulationResponse)
        assert hasattr(validated_response, "projected_roi")
        assert hasattr(validated_response, "incremental_roas")
        assert hasattr(validated_response, "pareto_optimal_budgets")
        
    except ValidationError as e:
        # Print the exact field mismatches for debugging
        print("\n" + "="*50)
        print("PYDANTIC VALIDATION ERROR DETECTED")
        print("The output dictionary does not match the frontend contract.")
        print("="*50)
        
        for error in e.errors():
            # e.g., ('budget_allocation', 'Meta') -> "budget_allocation -> Meta"
            field_loc = " -> ".join([str(loc) for loc in error.get("loc", [])])
            print(f"Field Location: {field_loc}")
            print(f"Error Message : {error.get('msg')}")
            print(f"Error Type    : {error.get('type')}")
            print(f"Input Value   : {error.get('input')}")
            print("-" * 50)
            
        raise e
