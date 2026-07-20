"""
===============================================================================
JSON Parser

Purpose
-------
Provides a resilient JSON parsing pipeline for LLM responses.

The parser NEVER calls Gemini.

Responsibilities
----------------
✓ Strip Markdown
✓ Extract JSON
✓ Remove trailing commas
✓ Balance braces
✓ Parse JSON

If parsing still fails,
JsonRepairRequired is raised.

References
----------
Python json module
https://docs.python.org/3/library/json.html

RFC 8259
https://www.rfc-editor.org/rfc/rfc8259

Clean Architecture
Robert C. Martin

===============================================================================
"""

from __future__ import annotations

import json
import re


class JsonRepairRequired(Exception):
    """
    Raised when local recovery is exhausted.
    """
    pass


class JsonParser:

    @staticmethod
    def parse(raw: str) -> dict | list:

        if not raw:
            return {}

        text = JsonParser._strip_markdown(raw)

        # Layer 1
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Layer 2
        text = JsonParser._extract_json(text)

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Layer 3
        text = JsonParser._remove_trailing_commas(text)

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Layer 4
        text = JsonParser._balance_json(text)

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        raise JsonRepairRequired()

    # --------------------------------------------------

    @staticmethod
    def _strip_markdown(text: str) -> str:

        text = text.strip()

        text = re.sub(
            r"^```(?:json)?",
            "",
            text,
            flags=re.IGNORECASE,
        )

        text = re.sub(
            r"```$",
            "",
            text,
        )

        return text.strip()

    # --------------------------------------------------

    @staticmethod
    def _extract_json(text: str) -> str:

        match = re.search(
            r"(\{[\s\S]*\}|\[[\s\S]*\])",
            text,
        )

        if match:
            return match.group(1)

        return text

    # --------------------------------------------------

    @staticmethod
    def _remove_trailing_commas(text: str) -> str:

        return re.sub(
            r",\s*([\]}])",
            r"\1",
            text,
        )

    # --------------------------------------------------

    @staticmethod
    def _balance_json(text: str) -> str:

        stack = []

        in_string = False

        escape = False

        for ch in text:

            if in_string:

                if ch == '"' and not escape:
                    in_string = False

                elif ch == "\\":
                    escape = not escape

                else:
                    escape = False

            else:

                if ch == '"':
                    in_string = True

                elif ch == "{":
                    stack.append("}")

                elif ch == "[":
                    stack.append("]")

                elif ch in ("}", "]"):

                    if stack and stack[-1] == ch:
                        stack.pop()

        if in_string:
            text += '"'

        while stack:
            text += stack.pop()

        return text