<<<<<<< Updated upstream
=======
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import os


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
 
    GEMINI_MODEL: str = "gemini-2.5-flash"
       
    GEMINI_REPAIR_MODEL: str = "gemini-2.5-pro"

    GEMINI_TEMPERATURE: float = 0.0

    GEMINI_TOP_P: float = 1.0

    GEMINI_MAX_OUTPUT_TOKENS: int = 30000
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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(settings.TMP_FOLDER, exist_ok=True)
>>>>>>> Stashed changes
