from __future__ import annotations

import time
from typing import Any, Dict, Optional, Tuple


class TTLCache:
    """Very small in-memory TTL cache for provider responses.

    Not suitable for multi-process or production persistence; good enough for local dev.
    """

    def __init__(self) -> None:
        self._store: Dict[str, Tuple[float, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if not entry:
            return None
        expires_at, value = entry
        if time.time() > expires_at:
            # expired
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        self._store[key] = (time.time() + ttl_seconds, value)


# Singleton cache for the app lifespan
provider_cache = TTLCache()
