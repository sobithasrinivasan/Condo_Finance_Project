from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):

    BASE_DIR: str = os.path.dirname(
        os.path.dirname(os.path.dirname(__file__))
    )

    # ==========================
    # Database
    # ==========================

    DB_HOST: str = Field("localhost")
    DB_PORT: int = Field(3306)
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    # ==========================
    # Gemini
    # ==========================

    GEMINI_API_KEY: str

    GEMINI_MODEL: str = "gemini-2.5-flash"

    # ==========================
    # Google Document AI
    # ==========================

    GOOGLE_APPLICATION_CREDENTIALS: str

    GOOGLE_PROJECT_ID: str

    GOOGLE_LOCATION: str

    GOOGLE_PROCESSOR_ID: str

    # ==========================
    # Upload
    # ==========================

    UPLOAD_FOLDER: str = "uploads"

    TMP_FOLDER: str = "tmp"

    # ==========================
    # Prompt
    # ==========================

    YAML_FOLDER: str = os.path.join(
        BASE_DIR,
        "yaml"
    )

    PROMPT_FOLDER: str = os.path.join(
        BASE_DIR,
        "app",
        "prompt",
        "templates"
    )

    # ==========================
    # Logging
    # ==========================

    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(settings.TMP_FOLDER, exist_ok=True)