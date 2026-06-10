import subprocess
import pytest

@pytest.mark.skip(reason="Requires live database, skipping in CI")
@pytest.mark.slow
def test_migration_idempotency():
    """
    Test that alembic migrations can be run up, down, and up again cleanly.
    This ensures idempotency and correctness of downgrade methods.
    
    Note: This test requires a database connection as configured in alembic.ini / .env.
    """
    try:
        # First ensure we are at head
        subprocess.check_call(["alembic", "upgrade", "head"])
        
        # Then downgrade to base
        subprocess.check_call(["alembic", "downgrade", "base"])
        
        # Finally go to head again
        subprocess.check_call(["alembic", "upgrade", "head"])
    except subprocess.CalledProcessError as e:
        pytest.fail(f"Migration idempotency test failed. Migrations are not safe to re-run: {e}")
