// services/task_scheduler.go
package services

import (
	"fmt"
	"log"
	"tg-web-app-bot/models"
	"tg-web-app-bot/utils"
	"time"
)

type TaskScheduler struct {
	userService *UserService
}

func NewTaskScheduler(userService *UserService) *TaskScheduler {
	return &TaskScheduler{
		userService: userService,
	}
}

// StartAllTasks запускает все периодические задачи
func (ts *TaskScheduler) StartAllTasks() {
	go ts.startOldChecklistsCleanup()
	go ts.startAutoChecklistsCopy()
	go ts.startMorningShiftReminders()
}

// startOldChecklistsCleanup запускает задачу очистки старых чек-листов
func (ts *TaskScheduler) startOldChecklistsCleanup() {
	// Выполняем очистку при запуске
	err := ts.userService.DeleteOldChecklists()
	if err != nil {
		log.Printf("⚠️ Ошибка при первоначальной очистке старых чек-листов: %v", err)
	} else {
		log.Printf("✅ Первоначальная очистка старых чек-листов выполнена")
	}
	
	// Запускаем ежедневную очистку
	for {
		// Вычисляем время до следующего запуска (в полночь)
		now := time.Now()
		nextRun := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
		duration := nextRun.Sub(now)
		
		log.Printf("🕒 Следующая очистка старых чек-листов запланирована на: %v (через %v)", nextRun, duration)
		
		// Ждем до следующего запуска
		time.Sleep(duration)
		
		// Выполняем очистку
		err := ts.userService.DeleteOldChecklists()
		if err != nil {
			log.Printf("⚠️ Ошибка при очистке старых чек-листов: %v", err)
		} else {
			log.Printf("✅ Ежедневная очистка старых чек-листов выполнена")
		}
	}
}

// startAutoChecklistsCopy запускает задачу копирования автосписков каждый час
func (ts *TaskScheduler) startAutoChecklistsCopy() {
	// Выполняем копирование при запуске
	err := ts.userService.ExecuteHourlyChecklistsCopy()
	if err != nil {
		log.Printf("⚠️ Ошибка при первоначальном копировании автосписков: %v", err)
	} else {
		log.Printf("✅ Первоначальное копирование автосписков выполнено")
	}

	 err = ts.userService.ExecuteAutoCompleteShifts()
    if err != nil {
        log.Printf("⚠️ Ошибка при первоначальном завершении смен: %v", err)
    } else {
        log.Printf("✅ Первоначальное автоматическое завершение смен выполнено")
    }

	
	// Запускаем ежечасное копирование
	for {
		// Вычисляем время до следующего запуска (в следующий час в 5 минут)
		now := time.Now()
		nextRun := time.Date(now.Year(), now.Month(), now.Day(), now.Hour()+1, 5, 0, 0, now.Location())
		duration := nextRun.Sub(now)
		
		log.Printf("🕒 Следующее копирование автосписков запланировано на: %v (через %v)", nextRun, duration)
		
		// Ждем до следующего запуска
		time.Sleep(duration)
		
		// Выполняем копирование
		err := ts.userService.ExecuteHourlyChecklistsCopy()
		if err != nil {
			log.Printf("⚠️ Ошибка при копировании автосписков: %v", err)
		} else {
			log.Printf("✅ Ежечасное копирование автосписков выполнено")
		}
		 err = ts.userService.ExecuteAutoCompleteShifts()
    if err != nil {
        log.Printf("⚠️ Ошибка при первоначальном завершении смен: %v", err)
    } else {
        log.Printf("✅ Первоначальное автоматическое завершение смен выполнено")
    }
	}
}

// startMorningShiftReminders запускает задачу отправки утренних напоминаний о смене
func (ts *TaskScheduler) startMorningShiftReminders() {
	// Запускаем ежедневную проверку в 12 часов утра (12:00)
	for {
		// Вычисляем время до следующего запуска (в 12:00 следующего дня)
		now := time.Now()
		
		// Определяем следующее время запуска
		var nextRun time.Time
		if now.Hour() < 12 {
			// Если сейчас до 12:00, запускаем сегодня в 12:00
			nextRun = time.Date(now.Year(), now.Month(), now.Day(), 12, 0, 0, 0, now.Location())
		} else {
			// Если сейчас после 12:00, запускаем завтра в 12:00
			nextRun = time.Date(now.Year(), now.Month(), now.Day()+1, 12, 0, 0, 0, now.Location())
		}
		
		duration := nextRun.Sub(now)
		
		log.Printf("🕒 Следующая проверка утренних напоминаний запланирована на: %v (через %v)", nextRun, duration)
		
		// Ждем до следующего запуска
		time.Sleep(duration)
		
		// Выполняем отправку напоминаний
		err := ts.sendMorningShiftReminders()
		if err != nil {
			log.Printf("⚠️ Ошибка при отправке утренних напоминаний: %v", err)
		} else {
			log.Printf("✅ Утренние напоминания отправлены")
		}
	}
}

// sendMorningShiftReminders отправляет утренние напоминания о смене
func (ts *TaskScheduler) sendMorningShiftReminders() error {
	// Получаем дату на следующий день
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	
	// Получаем всех пользователей, у которых есть смена на следующий день
	schedules, err := ts.userService.userRepo.GetSchedulesForDate(tomorrow)
	if err != nil {
		return err
	}
	
	// Группируем расписания по пользователям
	userSchedules := make(map[int64][]*models.Schedule)
	for _, schedule := range schedules {
		userSchedules[schedule.WorkerID] = append(userSchedules[schedule.WorkerID], schedule)
	}
	
	// Отправляем напоминания каждому пользователю
	for userID, userScheds := range userSchedules {
		// Получаем информацию о пользователе
		user, err := ts.userService.GetUserByID(userID)
		if err != nil {
			log.Printf("⚠️ Ошибка получения пользователя %d: %v", userID, err)
			continue
		}
		
		// Проверяем, что у пользователя есть ChatID
		if user.ChatID == nil {
			log.Printf("⚠️ У пользователя %d нет ChatID для отправки напоминания", userID)
			continue
		}
		
		// Формируем сообщение с информацией о всех сменах пользователя
		message := "🌅 Доброе утро! Напоминаем о ваших сменах на завтра:\n\n"
		
		for _, schedule := range userScheds {
			// Получаем информацию о зоне
			var zoneName string
			if schedule.ZoneID != nil {
				zone, err := ts.userService.userRepo.GetZoneByID(*schedule.ZoneID)
				if err == nil && zone != nil {
					zoneName = zone.Name
				} else {
					zoneName = "Неизвестная зона"
				}
			} else {
				zoneName = "Зона не указана"
			}
			
			// Форматируем время в читаемый вид
			startTime := utils.FormatTimeForDisplay(schedule.PlannedStartTime)
			endTime := utils.FormatTimeForDisplay(schedule.PlannedEndTime)
			
			message += fmt.Sprintf("📍 %s\n", zoneName)
			message += fmt.Sprintf("🕐 Время: %s - %s\n", startTime, endTime)
			message += "────────────────────\n"
		}
		
		message += "\nХорошего рабочего дня! ✨"
		
		// Отправляем сообщение
		err = ts.userService.SendTelegramNotification(*user.ChatID, message)
		if err != nil {
			log.Printf("⚠️ Ошибка отправки напоминания пользователю %d: %v", userID, err)
		} else {
			log.Printf("✅ Напоминание отправлено пользователю %d", userID)
		}
	}
	
	return nil
}
