import os
from functools import lru_cache
from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class FeatureFlags(BaseModel):
    ENABLE_TRANSFER_LEARNING: bool = False
    ENABLE_COMMUNITY_DETECTION: bool = False
    OFFLINE_LLM_FALLBACK: bool = False

class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # Database URIs
    DATABASE_URL: str = "postgresql://app_user:secure_password_here@localhost:5432/postgres"
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = "secure_password_here"
    WEAVIATE_URL: str = "http://localhost:8080"

    # Redis
    REDIS_PASSWORD: str = "1234"
    REDIS_URL: str = "redis://:1234@localhost:6379/0"

    # Celery (defaults mirror REDIS_URL so Celery connects with auth)
    CELERY_BROKER_URL: str = "redis://:1234@localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://:1234@localhost:6379/0"

    # API Keys
    CLERK_SECRET_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    FIRECRAWL_API_KEY: str = ""

    # Feature Flags
    flags: FeatureFlags = Field(default_factory=FeatureFlags)
    
    # Engine specific config (from main.py)
    PE_MODEL_PATH: str = "models/xgb_pipeline.joblib"
    PE_METADATA_PATH: Optional[str] = None
    PE_BACKGROUND_PARQUET: str = "data/processed/train.parquet"
    PE_RANDOM_STATE: int = 42

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        extra="ignore"
    )

    @model_validator(mode="after")
    def _build_database_url_from_components(self) -> "Settings":
        """Build DATABASE_URL from individual POSTGRES_* env vars when
        DATABASE_URL was not explicitly provided (i.e. still at default).

        This allows CI environments that set POSTGRES_USER, POSTGRES_PASSWORD,
        etc. to connect without needing a full DATABASE_URL."""
        default_url = "postgresql://app_user:secure_password_here@localhost:5432/postgres"
        if self.DATABASE_URL != default_url:
            # DATABASE_URL was explicitly set — respect it.
            return self

        pg_user = os.getenv("POSTGRES_USER")
        pg_password = os.getenv("POSTGRES_PASSWORD")
        if pg_user and pg_password:
            pg_host = os.getenv("POSTGRES_HOST", "localhost")
            pg_port = os.getenv("POSTGRES_PORT", "5432")
            pg_db = os.getenv("POSTGRES_DB", "postgres")
            self.DATABASE_URL = (
                f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_db}"
            )
        return self

@lru_cache
def get_settings() -> Settings:
    return Settings()

