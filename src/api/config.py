from functools import lru_cache
from typing import Literal, Optional
from pydantic import BaseModel, Field
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
    WEAVIATE_URL: str = "http://localhost:8080"
    REDIS_URL: str = "redis://localhost:6379/0"

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

@lru_cache
def get_settings() -> Settings:
    return Settings()
