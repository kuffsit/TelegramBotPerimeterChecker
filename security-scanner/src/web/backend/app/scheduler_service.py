"""
Сервис планировщика сканирований
"""
import sys
import os
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from croniter import croniter
import logging

# Добавляем путь к корневой директории проекта
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.database import SessionLocal
from backend.app import models, schemas
from backend.app.scanner_service import ScannerService

logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.scheduler.start()
        self.scanner_service = ScannerService()
        logger.info("Планировщик запущен")
    
    def add_schedule(self, schedule: models.ScanSchedule, db: Session):
        """Добавить расписание в планировщик"""
        try:
            # Функция-обертка для запуска сканирования
            def run_scheduled_scan():
                self._execute_scheduled_scan(schedule.id)
            
            # Добавляем задачу в планировщик
            job_id = f"scan_schedule_{schedule.id}"
            self.scheduler.add_job(
                func=run_scheduled_scan,
                trigger=CronTrigger.from_crontab(schedule.cron_expression),
                id=job_id,
                name=f"Сканирование: {schedule.name}",
                replace_existing=True
            )
            
            # Обновляем next_run в базе данных
            self._update_next_run(schedule.id, db)
            
            logger.info(f"Расписание {schedule.name} добавлено в планировщик")
            
        except Exception as e:
            logger.error(f"Ошибка добавления расписания {schedule.name}: {e}")
            raise
    
    def remove_schedule(self, schedule_id: int):
        """Удалить расписание из планировщика"""
        try:
            job_id = f"scan_schedule_{schedule_id}"
            self.scheduler.remove_job(job_id)
            logger.info(f"Расписание {schedule_id} удалено из планировщика")
        except Exception as e:
            logger.error(f"Ошибка удаления расписания {schedule_id}: {e}")
    
    def update_schedule(self, schedule: models.ScanSchedule, db: Session):
        """Обновить расписание в планировщике"""
        # Сначала удаляем старое расписание
        self.remove_schedule(schedule.id)
        
        # Если расписание активно, добавляем новое
        if schedule.is_active:
            self.add_schedule(schedule, db)
    
    def _execute_scheduled_scan(self, schedule_id: int):
        """Выполнить запланированное сканирование"""
        db = SessionLocal()
        try:
            # Получаем расписание
            schedule = db.query(models.ScanSchedule).filter(
                models.ScanSchedule.id == schedule_id
            ).first()
            
            if not schedule or not schedule.is_active:
                logger.warning(f"Расписание {schedule_id} не найдено или неактивно")
                return
            
            # Получаем домены
            domains = db.query(models.Domain).filter(
                models.Domain.id.in_(schedule.domain_ids)
            ).all()
            
            if not domains:
                logger.warning(f"Домены для расписания {schedule_id} не найдены")
                return
            
            # Сканирование для каждого домена
            for domain in domains:
                try:
                    # Новое сканирование в БД
                    scan = models.Scan(
                        domain_id=domain.id,
                        status="running",
                        started_at=datetime.now()
                    )
                    db.add(scan)
                    db.commit()
                    
                    # Запуск сканирования
                    self.scanner_service.run_single_scan(scan.id, db)
                    logger.info(f"Запущено сканирование домена {domain.name} по расписанию {schedule.name}")
                except Exception as e:
                    logger.error(f"Ошибка запуска сканирования домена {domain.name}: {e}")
            
            # Обновляем last_run
            schedule.last_run = datetime.now()
            self._update_next_run(schedule_id, db)
            db.commit()
            
        except Exception as e:
            logger.error(f"Ошибка выполнения запланированного сканирования {schedule_id}: {e}")
            db.rollback()
        finally:
            db.close()
    
    def _update_next_run(self, schedule_id: int, db: Session):
        """Обновить время следующего запуска"""
        try:
            schedule = db.query(models.ScanSchedule).filter(
                models.ScanSchedule.id == schedule_id
            ).first()
            
            if schedule:
                # Вычисляем следующее время запуска
                cron = croniter(schedule.cron_expression, datetime.now())
                schedule.next_run = cron.get_next(datetime)
                db.commit()
                
        except Exception as e:
            logger.error(f"Ошибка обновления next_run для расписания {schedule_id}: {e}")
    
    def load_all_schedules(self):
        """Загрузить все активные расписания при запуске"""
        db = SessionLocal()
        try:
            schedules = db.query(models.ScanSchedule).filter(
                models.ScanSchedule.is_active == True
            ).all()
            
            for schedule in schedules:
                try:
                    self.add_schedule(schedule, db)
                    logger.info(f"Загружено расписание: {schedule.name}")
                except Exception as e:
                    logger.error(f"Ошибка загрузки расписания {schedule.name}: {e}")
                    
        except Exception as e:
            logger.error(f"Ошибка загрузки расписаний: {e}")
        finally:
            db.close()
    
    def get_job_status(self, schedule_id: int):
        """Получить статус задачи в планировщике"""
        try:
            job_id = f"scan_schedule_{schedule_id}"
            job = self.scheduler.get_job(job_id)
            
            if job:
                return {
                    "exists": True,
                    "next_run": job.next_run_time,
                    "trigger": str(job.trigger)
                }
            else:
                return {"exists": False}
                
        except Exception as e:
            logger.error(f"Ошибка получения статуса задачи {schedule_id}: {e}")
            return {"exists": False, "error": str(e)}
    
    def shutdown(self):
        """Остановить планировщик"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Планировщик остановлен")

# Глобальный экземпляр планировщика
scheduler_service = SchedulerService()
