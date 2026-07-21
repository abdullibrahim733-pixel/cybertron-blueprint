from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    api_url: str = "http://localhost:4000"
    api_secret: str = "dev-secret-change-in-production"
    ai_port: int = 8000

    class Config:
        env_file = ".env"

settings = Settings()
