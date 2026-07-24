from typing import Dict, Type


class BaseExtractor:

    document_type = "DEFAULT"

    def pre_process(self, ocr_text: str) -> str:
        return ocr_text.strip()

    def post_process(self, result: dict) -> dict:
        return result


class ExtractorRegistry:

    _registry: Dict[str, Type[BaseExtractor]] = {}

    @classmethod
    def register(cls, document_type: str):

        def decorator(extractor_class):
            cls._registry[document_type.upper()] = extractor_class
            return extractor_class

        return decorator

    @classmethod
    def get_extractor(cls, document_type: str) -> BaseExtractor:

        document_type = (document_type or "DEFAULT").upper()

        extractor_class = cls._registry.get(
            document_type,
            cls._registry["DEFAULT"]
        )

        return extractor_class()

    @classmethod
    def supported_document_types(cls):
        return sorted(cls._registry.keys())


@ExtractorRegistry.register("DEFAULT")
class DefaultExtractor(BaseExtractor):

    document_type = "DEFAULT"

@ExtractorRegistry.register("INVOICE")
class InvoiceExtractor(BaseExtractor):

    document_type = "INVOICE"

    def pre_process(self, ocr_text: str) -> str:
        return ocr_text.strip()

    def post_process(self, result: dict) -> dict:
        return result


@ExtractorRegistry.register("BANK_STATEMENT")
class BankStatementExtractor(BaseExtractor):

    document_type = "BANK_STATEMENT"

    def pre_process(self, ocr_text: str) -> str:
        return ocr_text.strip()

    def post_process(self, result: dict) -> dict:
        return result