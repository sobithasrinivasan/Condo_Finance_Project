from fastapi import HTTPException


class AppException(HTTPException):

    def __init__(
        self,
        status_code: int,
        message: str
    ):
        super().__init__(
            status_code=status_code,
            detail=message
        )


class PromptNotFoundException(AppException):

    def __init__(
        self,
        message: str = "Prompt not found."
    ):
        super().__init__(
            status_code=404,
            message=message
        )


class PromptConfigurationException(AppException):

    def __init__(
        self,
        message: str = "Invalid prompt configuration."
    ):
        super().__init__(
            status_code=500,
            message=message
        )


class OCRException(AppException):

    def __init__(
        self,
        message: str = "OCR extraction failed."
    ):
        super().__init__(
            status_code=500,
            message=message
        )


class GeminiException(AppException):

    def __init__(
        self,
        message: str = "Gemini extraction failed."
    ):
        super().__init__(
            status_code=500,
            message=message
        )


class ExtractionException(AppException):

    def __init__(
        self,
        message: str = "Document extraction failed."
    ):
        super().__init__(
            status_code=500,
            message=message
        )


class RepositoryException(AppException):

    def __init__(
        self,
        message: str = "Database operation failed."
    ):
        super().__init__(
            status_code=500,
            message=message
        )