// services/user_service.go
package services

import (
	"errors"
	"fmt"
	"log"
	"math"
	"os"
	"path/filepath"
	"strings"
	"tg-web-app-bot/models"
	"tg-web-app-bot/repository"
	"tg-web-app-bot/utils"
	"time"

	tele "gopkg.in/telebot.v4"
)

type UserService struct {
	userRepo    *repository.UserRepository
	bot         *tele.Bot
	mqttService *MQTTService
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{userRepo: userRepo}
}

func NewUserServiceWithBot(userRepo *repository.UserRepository, bot *tele.Bot) *UserService {
	return &UserService{userRepo: userRepo, bot: bot}
}

func NewUserServiceWithBotAndMQTT(userRepo *repository.UserRepository, bot *tele.Bot, mqttService *MQTTService) *UserService {
	return &UserService{userRepo: userRepo, bot: bot, mqttService: mqttService}
}

func (s *UserService) GetUserByID(UserID int64) (*models.User, error) {
    return s.userRepo.GetUserByID(UserID)
}
// DeleteUser - удаление пользователя
func (s *UserService) DeleteUser(userID int64) error {
    return s.userRepo.DeleteUser(userID)
}
// GetOrCreateUser получает существующего пользователя или создает нового
func (s *UserService) GetOrCreateUser(telegramID int64, username, firstName, lastName string) (*models.User, error) {
	// Сначала пытаемся получить существующего пользователя
	existingUser, err := s.userRepo.GetUserByTelegramID(telegramID)
	if err != nil {
		return nil, err
	}

	// Если пользователь существует, возвращаем его
	if existingUser != nil {
		log.Printf("✅ Пользователь найден в БД: %s (ID: %d, confirmed: %t)", 
			existingUser.FirstName, existingUser.TelegramID, existingUser.Confirmed)
		return existingUser, nil
	}

	// Если пользователя нет, создаем нового
	user := &models.User{
		TelegramID:  telegramID,
		Username:    username,
		FirstName:   firstName,
		LastName:    lastName,
		PhoneNumber: "", // Будет заполнено позже через веб-приложение
		Confirmed:   false,
	}

	// Сохраняем нового пользователя в БД
	err = s.userRepo.CreateOrUpdateUser(user)
	if err != nil {
		log.Printf("❌ Ошибка создания пользователя: %v", err)
		return nil, err
	}

	log.Printf("✅ Новый пользователь создан в БД: %s (ID: %d)", firstName, telegramID)
	
	// Если у нас есть MQTT-сервис, публикуем сообщение о новом пользователе
	if s.mqttService != nil {
		err = s.mqttService.PublishUserNotification(user)
		if err != nil {
			log.Printf("⚠️ Ошибка публикации сообщения о новом пользователе в MQTT для пользователя %d: %v", user.ID, err)
	}
	}
	
	return user, nil
}

// UpdateUserPhone обновляет номер телефона пользователя
func (s *UserService) UpdateUserPhone(userID int64,telegramID int64, phoneNumber string) error {
	return s.userRepo.UpdateUserPhone(userID, telegramID, phoneNumber)
}

func (s *UserService) UpdateUserFull(userID int64, firstName, lastName, username, phoneNumber string, confirmed bool) error {
    return s.userRepo.UpdateUserFull(userID, firstName, lastName, username, phoneNumber, confirmed)
}

func (s *UserService) ConfirmUser(telegramID int64) error {
	return s.userRepo.UpdateUserConfirmation(telegramID, true)
}

func (s *UserService) GetUser(telegramID int64, userID ...int64) (*models.User, error) {
    return s.userRepo.GetUserByTelegramID(telegramID, userID...)
}

func (s *UserService) GetAllUser(userAll *[] *models.User) error {
    return s.userRepo.GetUserAll(userAll)
}

func (s *UserService) GetAllZones(zonesAll *[]*models.Zone) error {
    return s.userRepo.GetAllZones(zonesAll)
}

func (s *UserService) CreateZone(zone *models.Zone) error {
    err := s.userRepo.CreateZone(zone)
    if err != nil {
        return err
    }
    
    // Если у нас есть MQTT-сервис, добавляем новый топик для зоны
    if s.mqttService != nil {
        s.mqttService.AddZoneTopic(zone.ID)
    }
    
    return nil
}

func (s *UserService) DropZone(zoneId int64) error {
    err := s.userRepo.DropZone(zoneId)
    if err != nil {
        return err
    }
    
    // // Если у нас есть MQTT-сервис, добавляем новый топик для зоны
    // if s.mqttService != nil {
    //     s.mqttService.AddZoneTopic(zone.ID)
    // }
    
    return nil
}

func (s *UserService) UpdateZone(zoneID int64, updates map[string]interface{}) error {
    return s.userRepo.UpdateZone(zoneID, updates)
}

// GetChecklists получает чеклисты с фильтрацией
func (s *UserService) GetChecklists(date string, zoneID *int64) ([]*models.Checklist, error) {
    return s.userRepo.GetChecklists(date, zoneID)
}

// GetChecklistByID получает чеклист по ID
func (s *UserService) GetChecklistByID(checklistID int64) (*models.Checklist, error) {
    return s.userRepo.GetChecklistByID(checklistID)
}

// UpdateChecklist обновляет чеклист
// func (s *UserService) UpdateChecklist(checklistID int64, photo string) error {
//     // Получаем текущую информацию о чеклисте перед обновлением
//     checklist, err := s.GetChecklistByID(checklistID)
//     if err != nil {
//         return err
//     }
    
//     // Обновляем чеклист в базе данных (фото и статус выполнения)
//     err = s.userRepo.UpdateChecklist(checklistID, photo)
//     if err != nil {
//         return err
//     }
//     checklist.Photo = photo
//     checklist.Status = true
    
//     // Если у нас есть MQTT-сервис, публикуем сообщение о загрузке фото
//     if s.mqttService != nil {
//         // Обновляем путь к фото в чеклисте для публикации
//         checklist.Photo = photo
        
//         // Публикуем сообщение о загрузке фото с одинаково полной информацией как в топик зоны, так и админу
//         err = s.mqttService.PublishChecklistPhoto(checklist)
//         if err != nil {
//             log.Printf("⚠️ Ошибка публикации сообщения о фото в MQTT для чеклиста %d: %v", checklistID, err)
//         }
//     }
    
//     return nil
// }


// AddChecklistPhoto добавляет новое фото к существующим фото чеклиста
func (s *UserService) AddChecklistPhoto(checklist *models.Checklist, ) error {

    // Обновляем чеклист в базе данных
    err := s.userRepo.UpdateChecklistPhotoOnly(checklist.ID, checklist.Photo)
    if err != nil {
        return err
    }
    checklist.Status = true;

    
    // Если у нас есть MQTT-сервис, публикуем сообщение о добавлении фото
    if s.mqttService != nil {
        err = s.mqttService.PublishChecklistPhotoAdded(checklist)
        if err != nil {
            log.Printf("⚠️ Ошибка публикации сообщения о добавлении фото в MQTT для чеклиста %d: %v", checklist.ID, err)
        }
    }
    
    return nil
}


// UpdateUserConfirmed обновляет статус подтверждения пользователя
func (s *UserService) UpdateUserConfirmed(userID int64, confirmed bool) error {
    err := s.userRepo.UpdateUserConfirmed(userID, confirmed)
    if err != nil {
        return err
    }
    
    // Если у нас есть MQTT-сервис, публикуем сообщение о подтверждении пользователя
    if s.mqttService != nil {
        // Получаем информацию о пользователе для получения его Telegram ID
        // Используем существующий метод GetUserByTelegramID с userID как дополнительным параметром
        user, err := s.userRepo.GetUserByTelegramID(0, userID) // Передаем 0 как TelegramID и userID для поиска по ID
        if err != nil {
            log.Printf("⚠️ Ошибка получения информации о пользователе %d: %v", userID, err)
            // Продолжаем выполнение, даже если не удалось получить Telegram ID
            user = nil
        }
        
        var telegramID int64
        if user != nil {
            telegramID = user.TelegramID
        } else {
            // Если не удалось получить пользователя, используем 0 как заглушку
            // В реальном приложении может потребоваться другой способ получения Telegram ID
            telegramID = 0
            log.Printf("⚠️ Не удалось получить информацию о пользователе %d, используем Telegram ID 0", userID)
        }
        
        err = s.mqttService.PublishUserConfirmation(userID, telegramID, confirmed)
        if err != nil {
            log.Printf("⚠️ Ошибка публикации сообщения о подтверждении пользователя в MQTT для пользователя %d: %v", userID, err)
        }
    }
    
    return nil
}

// UpdateChecklistConfirmed обновляет статус подтверждения чеклиста
func (s *UserService) UpdateChecklistConfirmed(checklistID int64, confirmed bool) error {
    // Получаем текущую информацию о чеклисте перед обновлением
    checklist, err := s.GetChecklistByID(checklistID)
    if err != nil {
        return err
    }
    
    // Обновляем статус подтверждения в базе данных
    err = s.userRepo.UpdateChecklistConfirmed(checklistID, confirmed)
    if err != nil {
        return err
    }
    
    // Если у нас есть MQTT-сервис, публикуем сообщение о изменении статуса подтверждения
    if s.mqttService != nil {
        // Обновляем статус подтверждения в чеклисте для публикации
        checklist.Confirmed = confirmed
        err = s.mqttService.PublishChecklistConfirmation(checklist)
        if err != nil {
            log.Printf("⚠️ Ошибка публикации сообщения об изменении подтверждения в MQTT для чеклиста %d: %v", checklistID, err)
        }
    }
    
    return nil
}

// UpdateChecklistStatus обновляет статус выполнения чеклиста
func (s *UserService) UpdateChecklistStatus(checklist *models.Checklist) error {
  
    
    // Обновляем статус выполнения в базе данных
    err := s.userRepo.UpdateChecklistStatus(checklist.ID, checklist.Status)
    if err != nil {
        return err
    }
    
    // Если у нас есть MQTT-сервис, публикуем сообщение об изменении статуса
    if s.mqttService != nil {
        err = s.mqttService.PublishChecklistStatus(checklist)
        if err != nil {
            log.Printf("⚠️ Ошибка публикации сообщения об изменении статуса в MQTT для чеклиста %d: %v", checklist.ID, err)
        }
    }
    
    return nil
}

// CreateChecklist создает новый чеклист
func (s *UserService) CreateChecklist(checklist *models.Checklist) error {
    
    originalDate := checklist.Date
    err := s.userRepo.CreateChecklist(checklist)
    if err != nil {
        return err
    }
    if originalDate != nil {
        log.Printf("____________________%s",originalDate)
        return nil
    }
    

    currentDateStr := time.Now().Format("2006-01-02")

    
    // Публикуем сообщение в MQTT топик для зоны (только для сегодняшней даты)
    if s.mqttService != nil {
        err = s.mqttService.PublishChecklistMessage(checklist)
        if err != nil {
            log.Printf("⚠️ Ошибка публикации сообщения в MQTT для чеклиста %d: %v", checklist.ID, err)
        }
    }
    
    // Получаем работника, назначенного на эту зону в текущий день
    workers, err := s.GetWorkerByZoneID(checklist.ZoneID, currentDateStr)
    if err != nil {
        log.Printf("⚠️ Ошибка получения работника для зоны %d: %v", checklist.ZoneID, err)
        return nil // Не возвращаем ошибку, так как чек-лист уже создан
    }
    
    if workers == nil || len(workers) == 0 {
        log.Printf("⚠️ Работники не найдены для зоны %d на дату %s", checklist.ZoneID, currentDateStr)
        return nil // Не возвращаем ошибку, так как чек-лист уже создан
    }
    
    // Отправляем уведомление всем работникам (только для сегодняшней даты)
    for _, worker := range workers {
        // Отправляем уведомление работнику, если у него есть chat_id
        if worker.ChatID != nil {
            message := fmt.Sprintf("📋 Новый чек-лист для выполнения:\n\nЗона: %d\nОписание: %s\n\nПожалуйста, проверьте задание в веб-приложении.", 
                checklist.ZoneID, checklist.Description)
            err = s.SendTelegramNotification(*worker.ChatID, message)
            if err != nil {
                log.Printf("⚠️ Ошибка отправки уведомления работнику %d: %v", worker.ID, err)
                // Не возвращаем ошибку, так как это не критично для создания чек-листа
            } else {
                log.Printf("✅ Уведомление отправлено работнику %d (ChatID: %d)", worker.ID, *worker.ChatID)
            }
        } else {
            log.Printf("⚠️ У работника %d нет chat_id для отправки уведомления", worker.ID)
        }
    }
    
    return nil
}

// UpdateChecklistDescription обновляет описание чеклиста
func (s *UserService) UpdateChecklistDescription(checklistID int64, description string) error {
    // Получаем текущую информацию о чеклисте перед обновлением
    checklist, err := s.GetChecklistByID(checklistID)
    if err != nil {
        return err
    }

    // Обновляем описание в базе данных
    err = s.userRepo.UpdateChecklistDescription(checklistID, description)
    if err != nil {
        return err
    }

    // Обновляем описание в объекте для публикации
    checklist.Description = description

    // Если у нас есть MQTT-сервис, публикуем сообщение об изменении описания
    if s.mqttService != nil {
        err = s.mqttService.PublishChecklistDescriptionUpdated(checklist)
        if err != nil {
            log.Printf("⚠️ Ошибка публикации сообщения об изменении описания в MQTT для чеклиста %d: %v", checklistID, err)
        }
    }

    return nil
}

// DeleteChecklist удаляет чеклист
func (s *UserService) DeleteChecklist(checklistID int64) error {
    // Получаем информацию о чеклисте перед удалением для публикации
    checklist, err := s.GetChecklistByID(checklistID)
    if err != nil {
        return err
    }

    s.DeletePhotoFilePhotoPath(checklist.Photo)
    // Удаляем чеклист из базы данных
    err = s.userRepo.DeleteChecklist(checklistID)
    if err != nil {
        return err
    }

    // Если у нас есть MQTT-сервис, публикуем сообщение об удалении
    if s.mqttService != nil {
        err = s.mqttService.PublishChecklistDeleted(checklist)
        if err != nil {
            log.Printf("⚠️ Ошибка публикации сообщения об удалении в MQTT для чеклиста %d: %v", checklistID, err)
        }
    }

    return nil
}


// CreateAutoChecklist создает новый авто-чеклиста
func (s *UserService) CreateAutoChecklist(auto *models.Auto_cheklst) error {
    return s.userRepo.CreateAutoChecklist(auto)
}
func (s *UserService) DeletAutoChecklist(autoId int64) error {
    return s.userRepo.DeletAutoChecklist(autoId)
}
func (s *UserService) GetAutoChecklists(zoneID int64) ([]*models.Auto_cheklst, error) {
    return s.userRepo.GetAutoChecklists(zoneID)
}

// UpdateAutoChecklist обновляет авто-чеклист
func (s *UserService) UpdateAutoChecklist(autoChecklistID int64, description string, important bool) error {
    // Обновляем в базе данных
    err := s.userRepo.UpdateAutoChecklist(autoChecklistID, description, important)
    if err != nil {
        return err
    }

    return nil
}



// CreateSchedule создает новое расписание
func (s *UserService) CreateSchedule(schedule *models.Schedule) error {
    err := s.userRepo.CreateSchedule(schedule)

    if err != nil {
        return err
    }
    usr, err := s.userRepo.GetUserByID(schedule.WorkerID)
    zone, errr := s.userRepo.GetZoneByID(*schedule.ZoneID)

    if err != nil && errr!=nil{
        log.Printf("⚠️ работник с ид не найден  %d: %v", schedule.WorkerID, err)
        // Не возвращаем ошибку, так как расписание все равно должно быть создано
        // Просто пропускаем отправку уведомления
    } else if usr != nil {
        // Проверяем, что у пользователя есть ChatID перед отправкой уведомления
        if usr.ChatID != nil {
            message := fmt.Sprintf("Привет! %v у тебя смена на %v", utils.FormatDateString(schedule.Date), zone.Name)
            err = s.SendTelegramNotification(*usr.ChatID, message)
            if err != nil {
                log.Printf("⚠️ Ошибка отправки уведомления работнику %d: %v", usr.ID, err)
                // Не возвращаем ошибку, так как это не критично для создания расписания
            } else {
                log.Printf("✅ Уведомление отправлено работнику %d (ChatID: %d)", usr.ID, *usr.ChatID)
            }
        } else {
            log.Printf("⚠️ У работника %d нет ChatID для отправки уведомления", usr.ID)
        }
    }
    // Публикуем сообщение в MQTT топик для зоны
    if s.mqttService != nil {
        err = s.mqttService.PublishUserSchedule(schedule)
        if err != nil {
            log.Printf("⚠️ Ошибка публикации сообщения в MQTT для пользователя %d: %v", schedule.WorkerID, err)
        }
    }
    return nil
}

// UpdateActualStartTime обновляет время начала
func (s *UserService) UpdateActualStartTime(scheduleID int64, time string) error {
    return s.userRepo.UpdateActualStartTime(scheduleID, time)
}

// UpdateActualEndTime обновляет время окончания
func (s *UserService) UpdateActualEndTime(scheduleID int64, time string) error {
    return s.userRepo.UpdateActualEndTime(scheduleID, time)
}

// UpdatePhotoStart обновляет фото начала смены
func (s *UserService) UpdatePhotoStart(scheduleID int64, photoPath string) error {
    return s.userRepo.UpdatePhotoStart(scheduleID, photoPath)
}

// UpdatePhotoEnd обновляет фото окончания смены
func (s *UserService) UpdatePhotoEnd(scheduleID int64, photoPath string) error {
    return s.userRepo.UpdatePhotoEnd(scheduleID, photoPath)
}

//________________________________________________

func (s *UserService) GetAllFineTemplates() ([]*models.FineTemplate, error) {
    return s.userRepo.GetAllFineTemplates()
}

func (s *UserService) GetAllBonusTemplates() ([]*models.BonusTemplate, error) {
    return s.userRepo.GetAllBonusTemplates()
}

func (s *UserService) GetUserBonuses(userID int64, month string) ([]*models.Bonus, error) {
    return s.userRepo.GetUserBonuses(userID, month)
}

func (s *UserService) GetUserFines(userID int64, month string) ([]*models.Fine, error) {
    return s.userRepo.GetUserFines(userID, month)
}

func (s *UserService) CreateFineTemplate(template *models.FineTemplate) error {
    return s.userRepo.CreateFineTemplate(template)
}

func (s *UserService) CreateBonusTemplate(template *models.BonusTemplate) error {
    return s.userRepo.CreateBonusTemplate(template)
}

func (s *UserService) CreateBonus(bonus *models.Bonus) error {
    err:= s.userRepo.CreateBonus(bonus)
    if err!=nil {
        return err
    }
   user, err := s.userRepo.GetUserByID(bonus.UserID)
    if err != nil {
        return err
    }
    message := fmt.Sprintf("🎉 Вы получили премию!\n\n📝 Название: %s\n💰 Сумма: %.2f руб.\n📅 Дата: %s", 
        bonus.Name, 
        bonus.Price, 
        bonus.CreatedAt.Format("02.01.2006"))
		
	// Отправляем сообщение
	err = s.SendTelegramNotification(*user.ChatID, message)
	if err != nil {
		log.Printf("⚠️ Ошибка отправки напоминания пользователю %d: %v", user.ID, err)
	} else {
		log.Printf("✅ Напоминание отправлено пользователю %d", user.ID)
	}
    return err
}

func (s *UserService) CreateFine(fine *models.Fine) error {
    err:= s.userRepo.CreateFine(fine)

    user, err := s.userRepo.GetUserByID(fine.UserID)
    if err != nil {
        return err
    }
    message := fmt.Sprintf("😔 Вы получили штраф!\n\n📝 Название: %s\n💰 Сумма: %.2f руб.\n📅 Дата: %s", 
        fine.Name, 
        fine.Price, 
        fine.CreatedAt.Format("02.01.2006"))
		
	// Отправляем сообщение
	err = s.SendTelegramNotification(*user.ChatID, message)
	if err != nil {
		log.Printf("⚠️ Ошибка отправки напоминания пользователю %d: %v", user.ID, err)
	} else {
		log.Printf("✅ Напоминание отправлено пользователю %d", user.ID)
	}
    return err
}

func (s *UserService) DeleteFineTemplate(id int64) error {
    return s.userRepo.DeleteFineTemplate(id)
}
func (s *UserService) DeleteBonusTemplate(id int64) error {
    return s.userRepo.DeleteBonusTemplate(id)
}
func (s *UserService) DeleteBonus(id int64) error {
    return s.userRepo.DeleteBonus(id)
}
func (s *UserService) DeleteFine(id int64) error {
    return s.userRepo.DeleteFine(id)
}

//________________________________________________


// GetWorkerWeeklySchedule получает расписание на неделю для работника
func (s *UserService) GetWorkerWeeklySchedule(workerID int64, weekOffset int) ([]*models.Schedule, error) {
    return s.userRepo.GetWorkerWeeklySchedule(workerID, weekOffset)
}

// GetScheduleByID получает расписание по ID
func (s *UserService) GetScheduleByID(scheduleID int64) (*models.Schedule, error) {
    return s.userRepo.GetScheduleByID(scheduleID)
}

// GetAllWorkersWeeklySchedule получает расписание всех работников на неделю
func (s *UserService) GetAllWorkersWeeklySchedule(weekOffset int) ([]*models.Schedule, error) {
    return s.userRepo.GetAllWorkersWeeklySchedule(weekOffset)
}

func (s *UserService) GetSchedulesForDate(date string) ([]*models.Schedule, error) {
    return s.userRepo.GetSchedulesForDate(date)
}

// CalculateSalary рассчитывает заработную плату за указанный период с учетом штрафов и премий
func (s *UserService) CalculateSalary(workerID int64, startDate, endDate string) (map[string]interface{}, error) {
    schedules, err := s.userRepo.GetWorkerScheduleByPeriod(workerID, startDate, endDate)
    if err != nil {
        return nil, err
    }

    // Получаем штрафы и премии за указанный период
    fines, err := s.userRepo.GetUserFinesByPeriod(workerID, startDate, endDate)
    if err != nil {
        log.Printf("⚠️ Ошибка получения штрафов для пользователя %d за период %s - %s: %v", workerID, startDate, endDate, err)
        fines = []*models.Fine{} // продолжаем с пустым списком
    }

    bonuses, err := s.userRepo.GetUserBonusesByPeriod(workerID, startDate, endDate)
    if err != nil {
        log.Printf("⚠️ Ошибка получения премий для пользователя %d за период %s - %s: %v", workerID, startDate, endDate, err)
        bonuses = []*models.Bonus{} // продолжаем с пустым списком
    }

    var shifts []map[string]interface{}
    totalPlannedHours := 0.0
    totalActualHours := 0.0
    totalPlannedSalary := 0.0
    totalActualSalary := 0.0

    for _, schedule := range schedules {
        // Рассчитываем плановые часы (для информации)
        plannedHours := calculateHours(schedule.PlannedStartTime, schedule.PlannedEndTime)
        
        // Рассчитываем фактические часы (если есть)
        var actualHours float64
        var hasActualHours bool
        
        if schedule.ActualStartTime != nil && schedule.ActualEndTime != nil {
            // Получаем время в правильном формате
            planStartTime := parseTimeString(schedule.PlannedStartTime)
            planEndTime := parseTimeString(schedule.PlannedEndTime)
            actualStartTime := parseTimeString(*schedule.ActualStartTime)
            actualEndTime := parseTimeString(*schedule.ActualEndTime)
            
            // Определяем время начала для расчета зарплаты
            var workStartTime time.Time
            // Если сотрудник пришел раньше планового времени - используем плановое время
            if actualStartTime.Before(planStartTime) {
                workStartTime = planStartTime
            } else {
                workStartTime = actualStartTime
            }
            
            // Проверяем, если сотрудник ушел раньше времени окончания смены
            var workEndTime time.Time
            if actualEndTime.Before(planEndTime) {
                workEndTime = actualEndTime
            } else {
                workEndTime = planEndTime
            }
            
            // Если сотрудник ушел позже времени окончания смены - используем плановое время окончания
            if actualEndTime.After(planEndTime) {
                workEndTime = planEndTime
            }
            
            // Рассчитываем отработанные часы
            if workStartTime.Before(workEndTime) {
                actualHours = workEndTime.Sub(workStartTime).Hours()
            } else {
                // Если почему-то время начала позже времени окончания
                actualHours = 0
            }
            
            hasActualHours = true
            totalActualHours += actualHours
            totalActualSalary += actualHours * schedule.HourlyRate
        }

        // Расчет плановой зарплаты за смену (для информации)
        plannedShiftSalary := plannedHours * schedule.HourlyRate
        totalPlannedHours += plannedHours
        totalPlannedSalary += plannedShiftSalary

        // Формируем данные для смены
        shift := map[string]interface{}{
            "date":            schedule.Date,
            "zone_id":         schedule.ZoneID,
            "planned_start":   schedule.PlannedStartTime,
            "planned_end":     schedule.PlannedEndTime,
            "actual_start":    schedule.ActualStartTime,
            "actual_end":      schedule.ActualEndTime,
            "planned_hours":   roundToHalf(plannedHours),
            "hourly_rate":     schedule.HourlyRate,
            "planned_salary":  roundToHalf(plannedShiftSalary),
        }

        // Добавляем фактические данные только если они есть
        if hasActualHours {
            shift["actual_hours"] = roundToHalf(actualHours)
            shift["actual_salary"] = roundToHalf(actualHours * schedule.HourlyRate)
        } else {
            shift["actual_hours"] = nil
            shift["actual_salary"] = nil
        }

        shifts = append(shifts, shift)
    }

    // Расчет суммы штрафов
    totalFines := 0.0
    finesList := make([]map[string]interface{}, 0)
    for _, fine := range fines {
        totalFines += fine.Price
        finesList = append(finesList, map[string]interface{}{
            "id":    fine.ID,
            "name":  fine.Name,
            "price": fine.Price,
            "date":  fine.CreatedAt.Format("2006-01-02"),
        })
    }

    // Расчет суммы премий
    totalBonuses := 0.0
    bonusesList := make([]map[string]interface{}, 0)
    for _, bonus := range bonuses {
        totalBonuses += bonus.Price
        bonusesList = append(bonusesList, map[string]interface{}{
            "id":    bonus.ID,
            "name":  bonus.Name,
            "price": bonus.Price,
            "date":  bonus.CreatedAt.Format("2006-01-02"),
        })
    }

    // Итоговая зарплата с учетом штрафов и премий (считаем по фактическим часам)
    finalSalary := totalActualSalary + totalBonuses - totalFines

    result := map[string]interface{}{
        "worker_id":           workerID,
        "period":              fmt.Sprintf("%s - %s", startDate, endDate),
        "start_date":          startDate,
        "end_date":            endDate,
        "shifts":              shifts,
        "total_planned_hours": roundToHalf(totalPlannedHours),
        "total_actual_hours":  roundToHalf(totalActualHours),
        "total_planned_salary": roundToHalf(totalPlannedSalary),
        "total_actual_salary":  roundToHalf(totalActualSalary), // ЗП без учета штрафов/премий
        "shift_count":         len(shifts),
        
        // Штрафы
        "fines": finesList,
        "total_fines": roundToHalf(totalFines),
        "fines_count": len(finesList),
        
        // Премии
        "bonuses": bonusesList,
        "total_bonuses": roundToHalf(totalBonuses),
        "bonuses_count": len(bonusesList),
        
        // Итоговая зарплата (по фактическим часам + премии - штрафы)
        "final_salary": roundToHalf(finalSalary),
    }

    return result, nil
}

// CalculateAllSalaries рассчитывает заработную плату за указанный период для всех сотрудников
func (s *UserService) CalculateAllSalaries(startDate, endDate string) ([]map[string]interface{}, float64, error) {
    // Сначала получаем всех пользователей
    var allUsers []*models.User
    err := s.GetAllUser(&allUsers)
    if err != nil {
        return nil, 0, err
    }

    var allSalaries []map[string]interface{}
    var totalAmount float64 = 0

    // Для каждого пользователя, который не является администратором, рассчитываем зарплату
    for _, user := range allUsers {
        // Пропускаем администраторов
        if user.IsAdmin {
            continue
        }

        // Рассчитываем зарплату для пользователя
        salaryData, err := s.CalculateSalary(user.ID, startDate, endDate)
        if err != nil {
            log.Printf("❌ Ошибка расчета зарплаты для пользователя %d: %v", user.ID, err)
            // Продолжаем обработку других пользователей
            continue
        }

        // Добавляем информацию о пользователе к данным о зарплате
        salaryData["user_info"] = map[string]interface{}{
            "id":         user.ID,
            "telegram_id": user.TelegramID,
            "username":   user.Username,
            "first_name": user.FirstName,
            "last_name":  user.LastName,
        }

        allSalaries = append(allSalaries, salaryData)
        
        // Добавляем итоговую зарплату к общей сумме (с учетом штрафов и премий)
        if finalSalary, ok := salaryData["final_salary"].(float64); ok {
            totalAmount += finalSalary
        }
    }

    return allSalaries, totalAmount, nil
}

// parseTimeString парсит строку времени в формате "HH:MM:SS" или "HH:MM"
func parseTimeString(timeStr string) time.Time {
    // Добавляем базовую дату для корректного парсинга
    layouts := []string{
        "2006-01-02T15:04:05Z",
        "15:04:05",
        "15:04",
    }
    
    for _, layout := range layouts {
        t, err := time.Parse(layout, timeStr)
        if err == nil {
            // Для форматов без даты добавляем фиктивную дату
            if layout != "2006-01-02T15:04:05Z" {
                now := time.Now()
                t = time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), t.Second(), 0, now.Location())
            }
            return t
        }
    }
    
    log.Printf("❌ Ошибка парсинга времени %s", timeStr)
    return time.Time{}
}

// calculateHours вычисляет количество часов между двумя временами
func calculateHours(startTime, endTime string) float64 {
    start := parseTimeString(startTime)
    end := parseTimeString(endTime)
    
    // Если время окончания меньше времени начала, предполагаем, что смена переходит на следующий день
    if end.Before(start) {
        end = end.Add(24 * time.Hour)
    }
    
    duration := end.Sub(start)
    hours := duration.Hours()
    
    return hours
}

// adjustTimeFormat преобразует строку времени в формат с фиктивной датой для корректного сравнения
func adjustTimeFormat(timeStr string) time.Time {
    // Парсим время в формате "15:04:05"
    t, err := time.Parse("15:04:05", timeStr)
    if err != nil {
        // Если не удалось распарсить, пробуем другие форматы
        t, err = time.Parse("15:04", timeStr)
        if err != nil {
            log.Printf("❌ Ошибка парсинга времени %s: %v", timeStr, err)
            return time.Time{}
        }
    }
    
    // Добавляем фиктивную дату (сегодня) для возможности сравнения
    now := time.Now()
    return time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), t.Second(), 0, now.Location())
}

// calculateHoursFromTime вычисляет количество часов между двумя временами time.Time
func calculateHoursFromTime(startTime, endTime time.Time) float64 {
    // Если время окончания меньше времени начала, предполагаем, что смена переходит на следующий день
    if endTime.Before(startTime) {
        endTime = endTime.Add(24 * time.Hour)
    }
    
    duration := endTime.Sub(startTime)
    hours := duration.Hours()
    
    return hours // убрано округление здесь, т.к. оно есть в вызывающем коде
}

// calculateHours вычисляет количество часов между двумя временами
// func calculateHours(startTime, endTime string) float64 {
//     // Парсим полную дату-время
//     start, err := time.Parse(time.RFC3339, startTime)
//     if err != nil {
//         log.Printf("❌ Ошибка парсинга времени начала: %v", err)
//         return 0
//     }
    
//     end, err := time.Parse(time.RFC3339, endTime)
//     if err != nil {
//         log.Printf("❌ Ошибка парсинга времени окончания: %v", err)
//         return 0
//     }
    
//     // Если время окончания меньше времени начала, предполагаем, что смена переходит на следующий день
//     if end.Before(start) {
//         end = end.Add(24 * time.Hour)
//     }
    
//     duration := end.Sub(start)
//     hours := duration.Hours()
    
//     return hours // убрано округление здесь, т.к. оно есть в вызывающем коде
// }

// roundToHalf округляет число до ближайшего 0.5
func roundToHalf(value float64) float64 {
    return math.Round(value*2) / 2
}



// GetWorkerChecklists получает чеклисты пользователя на определенную дату
func (s *UserService) GetWorkerChecklists(workerID int64, date string) ([]*models.Checklist, error) {
    return s.userRepo.GetWorkerChecklists(workerID, date)
}

// GetWorkerChecklistByID проверяет, принадлежит ли чеклист пользователю и возвращает его
func (s *UserService) GetWorkerChecklistByID(workerID int64, checklistID int64) (*models.Checklist, error) {
    return s.userRepo.GetWorkerChecklistByID(workerID, checklistID)
}

// GetWorkerByZoneID возвращает работников, назначенного на указанную зону в определенную дату
func (s *UserService) GetWorkerByZoneID(zoneID int64, date string) ([]*models.User, error) {
    return s.userRepo.GetWorkerByZoneID(zoneID, date)
}

// SendTelegramNotification отправляет уведомление пользователю в Telegram
func (s *UserService) SendTelegramNotification(chatID int64, message string) error {
    if s.bot == nil {
        log.Printf("⚠️ Бот не инициализирован для отправки уведомления")
        return fmt.Errorf("бот не инициализирован")
    }
    
    user := &tele.User{ID: chatID}
    
    _, err := s.bot.Send(user, message)
    if err != nil {
        log.Printf("❌ Ошибка отправки уведомления пользователю %d: %v", chatID, err)
        return err
    }
    
    log.Printf("✅ Уведомление отправлено пользователю %d: %s", chatID, message)
    return nil
}

// UpdateUserChatID обновляет chat_id пользователя
func (s *UserService) UpdateUserChatID(telegramID int64, chatID int64) error {
    return s.userRepo.UpdateUserChatID(telegramID, chatID)
}

// DeleteOldChecklists удаляет старые чек-листы и соответствующие им файлы изображений
func (s *UserService) DeleteOldChecklists() error {
    // Получаем пути к файлам изображений, которые будут удалены
    photoPaths, err := s.userRepo.DeleteOldChecklists()
    if err != nil {
        log.Printf("❌ Ошибка при удалении старых чек-листов из базы данных: %v", err)
        return err
    }
    
    // Удаляем файлы изображений с диска
    for _, photoPath := range photoPaths {
        // Проверяем, что путь к файлу начинается с "/list/" для безопасности
        if strings.HasPrefix(photoPath, "/list/") {
            fullPath := filepath.Join("./public", photoPath)
            err := os.Remove(fullPath)
            if err != nil {
                log.Printf("⚠️ Ошибка при удалении файла изображения %s: %v", fullPath, err)
                // Не возвращаем ошибку, продолжаем удаление остальных файлов
            } else {
                log.Printf("✅ Файл изображения удален: %s", fullPath)
            }
        } else {
            log.Printf("⚠️ Предупреждение: Некорректный путь к изображению, пропущен: %s", photoPath)
        }
    }
    
    return nil
}


// ExecuteHourlyChecklistsCopy выполняет копирование автосписков каждый час
func (s *UserService) ExecuteHourlyChecklistsCopy() error {
    return s.userRepo.ExecuteHourlyChecklistsCopy()
}

// ExecuteHourlyChecklistsCopy выполняет копирование автосписков каждый час
func (s *UserService) GetAllChecklistsWithPhotos(checklichecklists *[]*models.Checklist) error {
    return s.userRepo.GetAllChecklistsWithPhotos(checklichecklists)
}

func (s *UserService) DeleteSchedule(scheduleID int64, UserID int64, Data string) error {
    err := s.userRepo.DeleteSchedule(scheduleID)
    if err != nil {
        return err
    }
    
    usr, err := s.GetUserByID(UserID)
    if err != nil {
        log.Printf("⚠️ Ошибка получения пользователя %d: %v", UserID, err)
        return nil
    }
    
    // Парсим дату и форматируем без времени
    parsedTime, err := time.Parse(time.RFC3339, Data)
    var cleanDate string
    if err != nil {
        // Если парсинг не удался, используем оригинальную строку
        cleanDate = Data
    } else {
        // Форматируем только дату
        cleanDate = parsedTime.Format("02.01.2006")
    }
    
    message := fmt.Sprintf("🗑️ Удалено расписание на %s", cleanDate)
    err = s.SendTelegramNotification(*usr.ChatID, message)
    if err != nil {
        log.Printf("⚠️ Ошибка отправки уведомления работнику %d: %v", usr.ID, err)
    } else {
        log.Printf("✅ Уведомление отправлено работнику %d (ChatID: %d)", usr.ID, *usr.ChatID)
    }
    
    return nil
}

// ExecuteAutoCompleteShifts выполняет автоматическое завершение смен
func (s *UserService) ExecuteAutoCompleteShifts() error {
    return s.userRepo.AutoCompleteEndedShifts()
}






// DeletePhotoFile удаляет файл фотографии по указанному пути
func (s *UserService) DeletePhotoFile(photoPath string) error {
    if photoPath == "" {
        return errors.New("путь к фото не указан")
    }
    // Получаем абсолютный путь
    exePath, err := os.Executable()
    if err != nil {
        log.Printf("❌ Не удалось получить путь к исполняемому файлу: %v", err)
        return fmt.Errorf("ошибка получения пути: %v", err)
    }
    exeDir := filepath.Dir(exePath)

    
    // Или другой путь к вашим файлам
    fullPath := filepath.Join(exeDir, "/public", photoPath)
    log.Printf("⚠️ ________________________________: %s", fullPath)
    // Удаляем файл
    err = os.Remove(fullPath)
    if err != nil {
        // Если файл не найден, не считаем это ошибкой (может быть уже удален)
        if os.IsNotExist(err) {
            log.Printf("⚠️ Файл уже удален: %s", fullPath)
            return nil
        }
        return fmt.Errorf("ошибка удаления файла %s: %v", fullPath, err)
    }
    
    log.Printf("✅ Файл удален: %s", fullPath)
    return nil
}

// GetChecklistsByIDs возвращает чек-листы по массиву ID
func (s *UserService) GetChecklistsByIDs(checklistIDs []int64) ([]*models.Checklist, error) {
    if len(checklistIDs) == 0 {
        return []*models.Checklist{}, nil
    }
    
    var checklists []*models.Checklist
    err := s.userRepo.GetChecklistsByIDs(&checklists, checklistIDs)
    if err != nil {
        return nil, err
    }
    
    return checklists, nil
}

// DeleteChecklistsByIDs удаляет чек-листы по массиву ID
func (s *UserService) DeleteChecklistsByIDs(checklistIDs []int64) error {
    if len(checklistIDs) == 0 {
        return errors.New("не указаны ID чек-листов для удаления")
    }
    
    // Получаем чек-листы, чтобы получить пути к фото
    checklists, err := s.GetChecklistsByIDs(checklistIDs)
    if err != nil {
        log.Printf("❌ Ошибка получения чек-листов: %v", err)
        // Продолжаем удаление даже если не получили фото
    }
    
    // Удаляем все фотографии
    for _, checklist := range checklists {
        if checklist.Photo != "" {
            // Разделяем строку с фото (могут быть несколько через запятую)
           err := s.DeletePhotoFilePhotoPath(checklist.Photo)
           log.Println(err)
        }
    }
    
    // Удаляем чек-листы из базы данных
    err = s.userRepo.DeleteChecklistsByIDs(checklistIDs)
    if err != nil {
        return fmt.Errorf("ошибка удаления чек-листов из БД: %v", err)
    }
    
    log.Printf("✅ Успешно удалено %d чек-листов", len(checklistIDs))
    return nil
}

// DeletePhotoFile удаляет файл фотографии по указанному пути
func (s *UserService) DeletePhotoFilePhotoPath(photoPath string) error {
    photos := strings.Split(photoPath, ",")
    
            for _, photo := range photos {
                //trimmedPhoto := strings.TrimSpace(photo)
                if photo != "" {
                    // Удаляем каждую фотографию
                    s.DeletePhotoFile(photo)
                    
                }
            }
            return nil
}

