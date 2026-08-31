"""Reorder an extracted result dict so its keys follow the canonical order
declared in the document's YAML schema (``Fields``), which mirrors the prompt
template in ``app/prompt/templates/**/*.md``.

Gemini returns JSON keys in an arbitrary order, so the raw extraction rarely
matches the structure the template asks for. This walks the schema tree and
rebuilds the dict in that exact order - recursing into object ``properties`` and
array ``items.properties`` - filling any key the model omitted with an empty
value and keeping any extra key the model invented at the end of its object
(nothing is dropped).
"""
from __future__ import annotations

from typing import Any


def _field_key(field: dict) -> str | None:
    return field.get("llm_key") or field.get("name")


def _empty_for(field: dict) -> Any:
    """The empty placeholder for a missing field: {} shaped by the schema for an
    object, [] for an array, "" for a scalar."""
    field_type = field.get("type")
    if field_type == "object":
        empty: dict[str, Any] = {}
        for prop in field.get("properties") or []:
            key = _field_key(prop)
            if key:
                empty[key] = _empty_for(prop)
        return empty
    if field_type == "array":
        return []
    return ""


def _order_value(value: Any, field: dict) -> Any:
    field_type = field.get("type")

    if field_type == "object":
        props = field.get("properties") or []
        if isinstance(value, dict):
            return _order_dict(value, props)
        if value in (None, ""):
            return _empty_for(field)
        return value

    if field_type == "array":
        if not isinstance(value, list):
            return []
        item_props = (field.get("items") or {}).get("properties") or []
        if not item_props:
            return value
        return [
            _order_dict(item, item_props) if isinstance(item, dict) else item
            for item in value
        ]

    return "" if value is None else value


def _order_dict(data: dict, fields: list[dict]) -> dict:
    ordered: dict[str, Any] = {}
    consumed: set[str] = set()

    for field in fields:
        key = _field_key(field)
        if not key:
            continue
        consumed.add(key)
        if isinstance(data, dict) and key in data:
            ordered[key] = _order_value(data[key], field)
        else:
            ordered[key] = _empty_for(field)

    # Preserve anything the model returned that the schema does not describe.
    if isinstance(data, dict):
        for key, value in data.items():
            if key not in consumed:
                ordered[key] = value

    return ordered


def order_result_to_schema(result: dict, fields: list[dict]) -> dict:
    """Return ``result`` rebuilt in the schema's key order. A no-op when either
    argument is empty / not the expected shape."""
    if not isinstance(result, dict) or not fields:
        return result

    # Recover a missing single top-level wrapper, e.g. the model returned the
    # invoice body directly instead of {"Invoice": {...}}.
    if len(fields) == 1:
        root = fields[0]
        root_key = _field_key(root)
        root_props = root.get("properties") or []
        if root_key and root_key not in result and root_props:
            child_keys = {_field_key(p) for p in root_props}
            if any(k in result for k in child_keys):
                result = {root_key: result}

    return _order_dict(result, fields)
