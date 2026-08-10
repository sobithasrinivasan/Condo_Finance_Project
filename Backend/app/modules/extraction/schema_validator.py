from __future__ import annotations

from typing import Any

_TYPE_MAP: dict[str, type | tuple[type, ...]] = {
    "string": str,
    "number": (int, float),
    "object": dict,
    "array": list,
}


class SchemaValidator:

    @classmethod
    def validate(cls, data: dict, fields: list[dict]) -> list[str]:
        errors: list[str] = []
        cls._validate_fields(data or {}, fields or [], path="", errors=errors)
        return errors

    @classmethod
    def _validate_fields(
        cls,
        data: Any,
        fields: list[dict],
        path: str,
        errors: list[str],
    ) -> None:
        if not isinstance(data, dict):
            errors.append(f"{path or '<root>'}: expected object, got {type(data).__name__}")
            return

        for field in fields:
            name = field.get("llm_key") or field.get("name")
            if not name:
                continue

            field_path = f"{path}.{name}" if path else name
            value = data.get(name)

            if value in (None, ""):
                if field.get("required"):
                    errors.append(f"{field_path}: required field missing")
                continue

            field_type = field.get("type")
            expected_type = _TYPE_MAP.get(field_type)
            if expected_type:
                is_valid = isinstance(value, expected_type)
               
                if not is_valid and field_type == "number" and isinstance(value, str):
                    try:
                        clean = "".join(c for c in value if c.isdigit() or c in (".", "-"))
                        if clean:
                            float(clean)
                            is_valid = True
                    except ValueError:
                        pass
                
                if not is_valid:
                    errors.append(f"{field_path}: expected {field_type}, got {type(value).__name__}")
                    continue

            if field_type == "object" and field.get("properties"):
                cls._validate_fields(value, field["properties"], field_path, errors)

            elif field_type == "array" and isinstance(value, list):
                item_props = (field.get("items") or {}).get("properties")
                if item_props:
                    for index, item in enumerate(value):
                        cls._validate_fields(item, item_props, f"{field_path}[{index}]", errors)
