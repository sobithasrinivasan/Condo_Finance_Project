class PromptCache:

    _cache = {}

    @classmethod
    def get(cls, key: str):

        return cls._cache.get(key)

    @classmethod
    def set(
        cls,
        key: str,
        value: str
    ):

        cls._cache[key] = value

    @classmethod
    def clear(cls):

        cls._cache.clear()

    @classmethod
    def exists(
        cls,
        key: str
    ) -> bool:

        return key in cls._cache