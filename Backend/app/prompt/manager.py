import os
import yaml

from app.core.config import settings
from app.core.exceptions import PromptNotFoundException


class PromptManager:
    _prompt_cache = {}

    def __init__(self):

        self.yaml_root = settings.YAML_FOLDER
        self.prompt_root = settings.PROMPT_FOLDER

    def get_prompt(
        self,
        document_type: str,
        **kwargs
    ) -> str:

        yaml_path = self._find_yaml(
            document_type=document_type,
            **kwargs
        )

        if yaml_path in self._prompt_cache:
            return self._prompt_cache[yaml_path]

        with open(yaml_path, "r", encoding="utf-8") as file:
            config = yaml.safe_load(file)

        prompt_path = config.get("prompt")

        if not prompt_path:
            raise PromptNotFoundException(
                f"'prompt' not found in {yaml_path}"
            )

        if not os.path.isabs(prompt_path):
            prompt_path = os.path.join(
                self.prompt_root,
                prompt_path
            )

        if not os.path.exists(prompt_path):
            raise PromptNotFoundException(
                f"Prompt file not found: {prompt_path}"
            )

        with open(prompt_path, "r", encoding="utf-8") as file:
            prompt = file.read()

        self._prompt_cache[yaml_path] = prompt

        return prompt

    def _find_yaml(
        self,
        document_type: str,
        **kwargs
    ) -> str:

        document_type = document_type.lower()

        folder = os.path.join(
            self.yaml_root,
            document_type
        )

        if not os.path.exists(folder):
            raise PromptNotFoundException(
                f"No YAML folder found for '{document_type}'."
            )

        yaml_files = [
            file
            for file in os.listdir(folder)
            if file.endswith(".yaml")
        ]

        if not yaml_files:
            raise PromptNotFoundException(
                f"No YAML files found in '{folder}'."
            )

        return os.path.join(
            folder,
            yaml_files[0]
        )

    def clear_cache(self):
        self._prompt_cache.clear()