from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import os
import re
from dotenv import load_dotenv

load_dotenv()


def _split_configured_paths(raw: str) -> list[str]:
    return [
        os.path.abspath(part.strip())
        for part in re.split(r"[,;\n]+", raw or "")
        if part.strip()
    ]


class Settings(BaseSettings):

    BASE_DIR: str = os.path.dirname(
        os.path.dirname(os.path.dirname(__file__))
    )


    DB_HOST: str = Field("localhost")
    DB_PORT: int = Field(3306)
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    GEMINI_API_KEY: str

    GEMINI_MODEL: str = "gemini-3.5-flash-lite"

    GEMINI_REPAIR_MODEL: str = "gemini-3.5-flash-lite"

    GEMINI_TEMPERATURE: float = 0.1

    GEMINI_TOP_P: float = 1.0

    GEMINI_MAX_OUTPUT_TOKENS: int = 30000

    # Google Cloud / Document AI Configurations
    GCP_PROJECT_ID: str | None = Field(default=None, validation_alias="GOOGLE_PROJECT_ID")
    GCP_LOCATION: str | None = Field(default="us", validation_alias="GOOGLE_LOCATION")
    GCP_PROCESSOR_ID: str | None = Field(default=None, validation_alias="GOOGLE_PROCESSOR_ID")
    GCP_FORM_PROCESSOR_ID: str | None = Field(default=None, validation_alias="GOOGLE_FORM_PROCESSOR_ID")
    GCP_LAYOUT_PROCESSOR_ID: str | None = Field(default=None, validation_alias="GOOGLE_LAYOUT_PROCESSOR_ID")

    UPLOAD_FOLDER: str = "uploads"

    TMP_FOLDER: str = "tmp"

    YAML_FOLDER: str = os.path.join(
        BASE_DIR,
        "app",
        "yaml"
    )

    PROMPT_FOLDER: str = os.path.join(
        BASE_DIR,
        "app",
        "prompt",
        "templates"
    )


    LOG_LEVEL: str = "INFO"

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:3001,http://localhost:8000,http://localhost:8080,http://localhost:8081"

    EMAIL_INGESTION_ALLOWED_ROOTS: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def email_ingestion_allowed_roots_list(self) -> list[str]:
        return _split_configured_paths(self.EMAIL_INGESTION_ALLOWED_ROOTS)


settings = Settings()

os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(settings.TMP_FOLDER, exist_ok=True)

