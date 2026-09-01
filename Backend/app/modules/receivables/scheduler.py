"""
Receivables Yearly Scheduler

On every app startup, checks whether receivables for the current year
have already been generated for each active association. If not, generates
them for all 12 months.

Also schedules a recurring job via APScheduler to run on Jan 1st each year
so that long-running app instances auto-generate for the new year.
"""

import logging
from datetime import date

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.database import get_db_connection

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _generate_for_current_year():
    """Check and generate receivables for the current year for all associations."""
    current_year = date.today().year

    logger.info("Receivables scheduler: checking year %d...", current_year)

    db = get_db_connection()
    try:
        from app.modules.receivables.repository import ReceivableRepository
        from app.modules.receivables.service import ReceivableService

        repo = ReceivableRepository(db)
        service = ReceivableService(db)

        association_ids = repo.get_all_active_association_ids()

        if not association_ids:
            logger.info("Receivables scheduler: no active associations found. Nothing to do.")
            return

        for assoc_id in association_ids:
            try:
                result = service.generate_yearly_receivables(
                    association_id=assoc_id,
                    year=current_year,
                    created_by=None,  # system-generated
                )
                if result["total_created"] > 0:
                    logger.info(
                        "Receivables scheduler: association %d, year %d — created %d, skipped %d",
                        assoc_id, current_year, result["total_created"], result["total_skipped"],
                    )
                else:
                    logger.info(
                        "Receivables scheduler: association %d, year %d — already up to date (%d skipped)",
                        assoc_id, current_year, result["total_skipped"],
                    )
            except Exception:
                logger.exception(
                    "Receivables scheduler: failed for association %d, year %d",
                    assoc_id, current_year,
                )
    finally:
        db.close()


def start_scheduler():
    """
    Called once during app startup.
    
    1. Immediately checks/generates receivables for the current year.
    2. Starts APScheduler with a cron job for Jan 1st 00:30 each year
       so long-running instances auto-generate for the next year.
    """
    global _scheduler

    # Step 1: Immediate on-startup check
    try:
        _generate_for_current_year()
    except Exception:
        logger.exception("Receivables scheduler: startup check failed")

    # Step 2: Schedule recurring yearly job (Jan 1st at 00:30)
    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(
        _generate_for_current_year,
        trigger=CronTrigger(month=1, day=1, hour=0, minute=30),
        id="receivables_yearly_generation",
        name="Generate yearly receivables on Jan 1st",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Receivables scheduler: APScheduler started (next run: Jan 1st 00:30)")


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Receivables scheduler: shut down.")
        _scheduler = None
