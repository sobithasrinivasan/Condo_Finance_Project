import os
import yaml

from app.core.exceptions import PromptNotFoundException


class PromptLoader:

    @staticmethod
    def load_yaml(
        yaml_path: str
    ) -> dict:

        if not os.path.exists(yaml_path):

            raise PromptNotFoundException(
                f"YAML file not found: {yaml_path}"
            )

        with open(
            yaml_path,
            "r",
            encoding="utf-8"
        ) as file:

            return yaml.safe_load(file) or {}

    @staticmethod
    def load_prompt(
        prompt_path: str
    ) -> str:

        if not os.path.exists(prompt_path):

            raise PromptNotFoundException(
                f"Prompt file not found: {prompt_path}"
            )

        with open(
            prompt_path,
            "r",
            encoding="utf-8"
        ) as file:

            return file.read()