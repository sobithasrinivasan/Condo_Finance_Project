from __future__ import annotations

import json
import re


class JsonRepairRequired(Exception):
    pass


class JsonParser:

    @staticmethod
    def parse(raw: str) -> dict | list:

        if not raw:
            return {}

        text = JsonParser._strip_markdown(raw)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        text = JsonParser._extract_json(text)

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        text = JsonParser._remove_trailing_commas(text)

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        text = JsonParser._balance_json(text)

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        raise JsonRepairRequired()

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

    @staticmethod
    def _extract_json(text: str) -> str:

        match = re.search(
            r"(\{[\s\S]*\}|\[[\s\S]*\])",
            text,
        )

        if match:
            return match.group(1)

        return text

    @staticmethod
    def _remove_trailing_commas(text: str) -> str:

        return re.sub(
            r",\s*([\]}])",
            r"\1",
            text,
        )

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