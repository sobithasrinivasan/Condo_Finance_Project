from __future__ import annotations

import logging
import threading

import google.generativeai as genai

from app.core.config import settings

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

        genai.configure(
            api_key=settings.GEMINI_API_KEY
        )

        self._models = {}

        logger.info("Gemini Client initialized successfully.")


    def get_model(
        self,
        model_name: str | None = None,
    ):
        

        model_name = (
            model_name
            or settings.GEMINI_MODEL
        )

        if model_name not in self._models:

            logger.info(
                "Loading Gemini model: %s",
                model_name,
            )

            self._models[model_name] = genai.GenerativeModel(
                model_name=model_name
            )

        return self._models[model_name]


    def extraction_model(self):

        return self.get_model(
            settings.GEMINI_MODEL
        )


    def repair_model(self):

        return self.get_model(
            settings.GEMINI_REPAIR_MODEL
        )


gemini_client = GeminiClient()