from __future__ import annotations

import logging
from typing import Any

from google.genai import types

from app.core.settings import settings
from app.modules.extraction.client import gemini_client
from app.modules.extraction.retry import retry
from app.modules.extraction.json_parser import (
    JsonParser,
    JsonRepairRequired,
)

logger = logging.getLogger(__name__)


class ExtractionEngine:

    def __init__(self):

        self.client = gemini_client

        self.genai_client = gemini_client.client

        self.model = self.client.extraction_model()

        self.repair_model = self.client.repair_model()

        logger.info(
            "Extraction Engine initialized."
        )
    @retry(
        retries=3,
        delay=1,
        backoff=2,
    )
    def _generate(
        self,
        prompt: str,
    ) -> str:
        logger.info("Calling Gemini model.")

        response = self.genai_client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=settings.GEMINI_TEMPERATURE,
                top_p=settings.GEMINI_TOP_P,
                max_output_tokens=settings.GEMINI_MAX_OUTPUT_TOKENS,
                response_mime_type="application/json",
            ),
        )

        if not response.text:

            logger.warning(
                "Gemini returned empty response."
            )

            return ""

        logger.info("Gemini response received.")

        return response.text

    def call_llm(
        self,
        prompt: str,
        ocr_text: str | None = None,
    ) -> str:

        if ocr_text:

            prompt = prompt.replace(
                "{{ocr_text}}",
                ocr_text,
            )

        logger.info(
            "Executing OCR based extraction."
        )

        return self._generate(prompt)

    @retry(
        retries=2,
        delay=1,
        backoff=2,
    )
    def repair_json(
        self,
        malformed_json: str,
    ) -> str:

        logger.warning(
            "Attempting LLM based JSON repair."
        )

        repair_prompt = f"""
                You are an expert JSON repair system.

                Rules:

                1. Return ONLY valid JSON.
                2. Preserve every key.
                3. Preserve every value.
                4. Do NOT hallucinate.
                5. Do NOT add explanations.
                6. Do NOT wrap inside markdown.
                7. Fix only syntax errors.

                Malformed JSON:

                {malformed_json}
                """

        response = self.genai_client.models.generate_content(
            model=self.repair_model,
            contents=repair_prompt,
            config=types.GenerateContentConfig(
                temperature=0,
                top_p=1,
                max_output_tokens=settings.GEMINI_MAX_OUTPUT_TOKENS,
                response_mime_type="application/json",
            ),
        )

        repaired = response.text.strip()

        logger.info(
            "LLM JSON repair completed."
        )

        return repaired


    def safe_json_parse(
        self,
        raw: str,
    ) -> dict[str, Any]:

        if not raw:

            logger.warning(
                "Received empty LLM response."
            )

            return {}

        try:

            return JsonParser.parse(raw)

        except JsonRepairRequired:

            logger.warning(
                "Local JSON recovery failed."
            )

        repaired = self.repair_json(raw)

        try:

            parsed = JsonParser.parse(repaired)

            logger.info(
                "Successfully parsed repaired JSON."
            )

            return parsed

        except Exception:

            logger.exception(
                "Unable to recover JSON."
            )

            return {}

    def extract_raw(
        self,
        prompt: str,
        ocr_text: str | None = None,
    ) -> str:

        logger.info(
            "Starting raw extraction."
        )

        return self.call_llm(
            prompt=prompt,
            ocr_text=ocr_text,
        )

    def extract(
        self,
        prompt: str,
        ocr_text: str | None = None,
    ) -> dict[str, Any]:

        logger.info(
            "Starting extraction pipeline."
        )

        raw = self.extract_raw(
            prompt=prompt,
            ocr_text=ocr_text,
        )

        parsed = self.safe_json_parse(raw)

        logger.info(
            "Extraction completed successfully."
        )

        return parsed

    def is_ready(self) -> bool:

        try:
            self.client.extraction_model()
            return True

        except Exception:
            logger.exception(
                "Gemini client initialization failed."
            )
            return False


    @staticmethod
    def version() -> str:
        return "1.0.0"

    def info(self) -> dict[str, Any]:

        return {

            "engine": "Gemini Extraction Engine",

            "version": self.version(),

            "model": settings.GEMINI_MODEL,

            "repair_model": settings.GEMINI_REPAIR_MODEL,

            "ready": self.is_ready(),

        }
