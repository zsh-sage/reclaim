from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "GLM SMART"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 days

    # Database
    DATABASE_URL: str = "postgresql://admin:password@localhost:5432/smart_reimburse"

    # LLM (ILMU API for chat model)
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.ilmu.ai/v1"
    # CHAT_MODEL: str = "ilmu-glm-5.1"
    CHAT_MODEL: str = "google/gemini-2.5-flash-lite"
    
    # (OpenRouter) for vision and embedding model
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    VISION_MODEL: str = "meta-llama/llama-3.2-11b-vision-instruct"
    EMBEDDING_MODEL: str = "openai/text-embedding-3-small"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
