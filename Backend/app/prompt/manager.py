import os

from app.core.settings import settings
from app.core.exceptions import PromptNotFoundException
from .loader import PromptLoader


class PromptManager:
    # Keyed by yaml_path -> {"yaml_mtime", "prompt_path", "prompt_mtime", "prompt"}.
    # Storing the mtimes means an edit to either file is picked up on the next
    # request automatically - no server restart or manual cache clear needed.
    _prompt_cache: dict = {}

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
        yaml_mtime = os.path.getmtime(yaml_path)

        cached = self._prompt_cache.get(yaml_path)
        if cached and cached["yaml_mtime"] == yaml_mtime:
            prompt_path = cached["prompt_path"]
            if os.path.exists(prompt_path) and os.path.getmtime(prompt_path) == cached["prompt_mtime"]:
                return cached["prompt"]

        yaml_config = PromptLoader.load_yaml(yaml_path)

        prompt_path = yaml_config.get("prompt") or yaml_config.get("Prompt")

        if not prompt_path:
            raise PromptNotFoundException(
                f"'prompt' or 'Prompt' not found in {yaml_path}"
            )

        if not os.path.isabs(prompt_path):
            prompt_path = os.path.join(
                self.prompt_root,
                prompt_path
            )

        prompt = PromptLoader.load_prompt(prompt_path)

        self._prompt_cache[yaml_path] = {
            "yaml_mtime": yaml_mtime,
            "prompt_path": prompt_path,
            "prompt_mtime": os.path.getmtime(prompt_path),
            "prompt": prompt,
        }

        return prompt

    def get_schema(
        self,
        document_type: str,
        **kwargs
    ) -> list[dict]:

        yaml_path = self._find_yaml(
            document_type=document_type,
            **kwargs
        )
        yaml_config = PromptLoader.load_yaml(yaml_path)

        return yaml_config.get("Fields") or yaml_config.get("fields") or []

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