from __future__ import annotations

import logging
import threading

from google import genai

from app.core.settings import settings

logger = logging.getLogger(__name__)


class GeminiClient:

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize()

        return cls._instance

    def _initialize(self):

        if not settings.GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY is not configured."
            )

        logger.info("Initializing Gemini Client...")


        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY
        )

        logger.info("Gemini Client initialized successfully.")

    def extraction_model(self) -> str:
        return settings.GEMINI_MODEL

    def repair_model(self) -> str:
        return settings.GEMINI_REPAIR_MODEL


gemini_client = GeminiClient()
