from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Enterprise Multi-Agent RAG Platform"
    APP_VERSION: str = "1.0.0"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4.1-mini"
    OLLAMA_URL: str = "http://127.0.0.1:11434/api/generate"
    OLLAMA_MODEL: str = "llama3.2"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
