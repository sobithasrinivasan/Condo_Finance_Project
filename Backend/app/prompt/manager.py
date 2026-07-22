import os
import yaml

from app.core.settings import settings
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
            settings = yaml.safe_load(file)

        prompt_path = settings.get("prompt") or settings.get("Prompt")

        if not prompt_path:
            raise PromptNotFoundException(
                f"'prompt' or 'Prompt' not found in {yaml_path}"
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

        document_type = document_type.lower().strip()

        # Normalize bank statement names
        if document_type in ("bank_statement", "bankstatement", "statements", "statement", "bank_statements"):
            document_type = "bank_statements"

        # Check if direct folder exists
        folder = os.path.join(
            self.yaml_root,
            document_type
        )

        if os.path.exists(folder):
            yaml_files = [
                file
                for file in os.listdir(folder)
                if file.endswith(".yaml")
            ]
            if yaml_files:
                return os.path.join(folder, yaml_files[0])

        # Search recursively for `{document_type}.yaml`
        for root, dirs, files in os.walk(self.yaml_root):
            for file in files:
                name_without_ext = os.path.splitext(file)[0].lower()
                if (
                    name_without_ext == document_type 
                    or name_without_ext.replace("_", "") == document_type.replace("_", "")
                ):
                    return os.path.join(root, file)

        # Fallback if name is invoice/invoices
        if document_type in ("invoice", "invoices"):
            inv_folder = os.path.join(self.yaml_root, "invoice")
            if os.path.exists(inv_folder):
                yaml_files = [f for f in os.listdir(inv_folder) if f.endswith(".yaml")]
                if yaml_files:
                    return os.path.join(inv_folder, yaml_files[0])

        raise PromptNotFoundException(
            f"No YAML configuration found for document type '{document_type}'."
        )

    def clear_cache(self):
        self._prompt_cache.clear()