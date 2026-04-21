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

    # LLM (via OpenRouter)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    CHAT_MODEL: str = "arcee-ai/trinity-large-preview:free"
    VISION_MODEL: str = "meta-llama/llama-3.2-11b-vision-instruct:free"
    EMBEDDING_MODEL: str = "openai/text-embedding-3-small"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
