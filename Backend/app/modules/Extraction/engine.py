from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import google.generativeai as genai

from app.core.config import settings
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

        response = self.model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
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
        retries=3,
        delay=1,
        backoff=2,
    )
    def call_llm_with_file(
        self,
        prompt: str,
        file_path: str,
        mime_type: str = "application/pdf",
    ) -> str:
        self.validate_file(file_path)
        self.validate_mime_type(mime_type)
        
        logger.info(
            "Uploading file to Gemini."
        )

        uploaded_file = genai.upload_file(
            path=file_path,
            mime_type=mime_type,
        )

        response = self.model.generate_content(
            [
                prompt,
                uploaded_file,
            ],
            generation_config=genai.types.GenerationConfig(
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

        logger.info(
            "File extraction completed."
        )

        return response.text

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

        response = self.repair_model.generate_content(
            repair_prompt,
            generation_config=genai.types.GenerationConfig(
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
    def extract_from_file(
        self,
        prompt: str,
        file_path: str,
        mime_type: str = "application/pdf",
    ) -> dict[str, Any]:

        logger.info(
            "Starting direct file extraction."
        )

        raw = self.call_llm_with_file(
            prompt=prompt,
            file_path=file_path,
            mime_type=mime_type,
        )

        return self.safe_json_parse(raw)        

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
    def supported_mime_types() -> set[str]:

        return {
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/tiff",
            "image/webp",
        }

    def validate_mime_type(
        self,
        mime_type: str,
    ) -> None:

        if mime_type not in self.supported_mime_types():

            raise ValueError(
                f"Unsupported MIME type: {mime_type}"
            )

    @staticmethod
    def validate_file(
        file_path: str,
    ) -> None:

        path = Path(file_path)

        if not path.exists():

            raise FileNotFoundError(
                f"File not found: {file_path}"
            )


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
