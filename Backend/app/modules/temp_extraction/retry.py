from __future__ import annotations

import logging
import time

from functools import wraps
from typing import Callable, TypeVar

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable)


def retry(
    retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple[type[Exception], ...] = (Exception,),
):

    def decorator(func: F) -> F:

        @wraps(func)
        def wrapper(*args, **kwargs):

            current_delay = delay

            for attempt in range(1, retries + 1):

                try:
                    return func(*args, **kwargs)

                except exceptions as exc:

                    if attempt == retries:

                        logger.exception(
                            "Retry failed after %s attempts.",
                            retries,
                        )
                        raise

                    logger.warning(
                        "Attempt %s/%s failed (%s). Retrying in %.1f seconds.",
                        attempt,
                        retries,
                        exc,
                        current_delay,
                    )

                    time.sleep(current_delay)

                    current_delay *= backoff

        return wrapper

    return decorator