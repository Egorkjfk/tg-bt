// services/user_service.go
package services

import (
	"fmt"
	"log"
	"math"
	"os"
	"path/filepath"
	"strings"
	"tg-web-app-bot/models"
	"tg-web-app-bot/repository"
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
func (s *UserService) UpdateChecklist(checklistID int64, photo string) error {
    // Получаем текущую информацию о чеклисте перед обновлением
    checklist, err := s.GetChecklistByID(checklistID)
    if err != nil {
        return err
    }
    
    // Обновляем чеклист в базе данных (фото и статус выполнения)
    err = s.userRepo.UpdateChecklist(checklistID, photo)
    if err != nil {
        return err
    }
    checklist.Photo = photo
    checklist.Status = true
    
    // Если у нас есть MQTT-сервис, публикуем сообщение о загрузке фото
    if s.mqttService != nil {
        // Обновляем путь к фото в чеклисте для публикации
        checklist.Photo = photo
        
        // Публикуем сообщение о загрузке фото с одинаково полной информацией как в топик зоны, так и админу
        err = s.mqttService.PublishChecklistPhoto(checklist)
        if err != nil {
            log.Printf("⚠️ Ошибка публикации сообщения о фото в MQTT для чеклиста %d: %v", checklistID, err)
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

        log.Printf("⚠️ sssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss")
        
        err = s.mqttService.PublishChecklistConfirmation(checklist)
        if err != nil {
            log.Printf("⚠️ Ошибка публикации сообщения об изменении подтверждения в MQTT для чеклиста %d: %v", checklistID, err)
        }
    }
    
    return nil
}

// CreateChecklist создает новый чеклист
func (s *UserService) CreateChecklist(zoneID int64, description string, adminID int64, important bool) error {
    checklist := &models.Checklist{
        ZoneID:      zoneID,
        Description: description,
        AdminID:     &adminID,
        Important:   important,
        // Date, Status, Confirmed, IssueTime - устанавливаются автоматически в БД
    }
    
    err := s.userRepo.CreateChecklist(checklist)
    if err != nil {
        return err
    }
    
    // Публикуем сообщение в MQTT топик для зоны
    if s.mqttService != nil {
        err = s.mqttService.PublishChecklistMessage(checklist)
        if err != nil {
            log.Printf("⚠️ Ошибка публикации сообщения в MQTT для чеклиста %d: %v", checklist.ID, err)
        }
    }
    
    // Получаем текущую дату
    currentDate := time.Now().Format("2006-01-02")
    
    // Получаем работника, назначенного на эту зону в текущий день
    workers, err := s.GetWorkerByZoneID(zoneID, currentDate)
    if err != nil {
        log.Printf("⚠️ Ошибка получения работника для зоны %d: %v", zoneID, err)
        return nil // Не возвращаем ошибку, так как чек-лист уже создан
    }
    
    if workers == nil || len(workers) == 0 {
        log.Printf("⚠️ Работники не найдены для зоны %d на дату %s", zoneID, currentDate)
        return nil // Не возвращаем ошибку, так как чек-лист уже создан
    }
    
    // Отправляем уведомление всем работникам
    for _, worker := range workers {
        // Отправляем уведомление работнику, если у него есть chat_id
        if worker.ChatID != nil {
            message := fmt.Sprintf("📋 Новый чек-лист для выполнения:\n\nЗона: %d\nОписание: %s\n\nПожалуйста, проверьте задание в веб-приложении.", zoneID, description)
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


// CreateSchedule создает новое расписание
func (s *UserService) CreateSchedule(schedule *models.Schedule) error {
    err := s.userRepo.CreateSchedule(schedule)

    if err != nil {
        return err
    }
    usr, err := s.userRepo.GetUserByID(schedule.WorkerID)

    if err != nil {
        log.Printf("⚠️ работник с ид не найден  %d: %v", schedule.WorkerID, err)
        // Не возвращаем ошибку, так как расписание все равно должно быть создано
        // Просто пропускаем отправку уведомления
    } else if usr != nil {
        // Проверяем, что у пользователя есть ChatID перед отправкой уведомления
        if usr.ChatID != nil {
            message := fmt.Sprintf("Добавлено расписание на %v", schedule.Date)
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

// CalculateSalary рассчитывает заработную плату за указанный месяц
func (s *UserService) CalculateSalary(workerID int64, month string) (map[string]interface{}, error) {
    schedules, err := s.userRepo.GetWorkerMonthlySchedule(workerID, month)
    if err != nil {
        return nil, err
    }

    var shifts []map[string]interface{}
    totalPlannedHours := 0.0
    totalActualHours := 0.0
    totalPlannedSalary := 0.0
    totalActualSalary := 0.0

    for _, schedule := range schedules {
        // Рассчитываем плановые часы
        plannedHours := calculateHours(schedule.PlannedStartTime, schedule.PlannedEndTime)
        
        // Рассчитываем фактические часы (если есть)
        var actualHours float64
        var hasActualHours bool
        
        if schedule.ActualStartTime != nil && schedule.ActualEndTime != nil {
            actualHours = calculateHours(*schedule.ActualStartTime, *schedule.ActualEndTime)
            hasActualHours = true
            totalActualHours += actualHours
            totalActualSalary += actualHours * schedule.HourlyRate
        }

        // Расчет зарплаты за смену
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

    result := map[string]interface{}{
        "worker_id":           workerID,
        "month":               month,
        "shifts":              shifts,
        "total_planned_hours": roundToHalf(totalPlannedHours),
        "total_actual_hours":  roundToHalf(totalActualHours),
        "total_planned_salary": roundToHalf(totalPlannedSalary),
        "total_actual_salary":  roundToHalf(totalActualSalary),
        "shift_count":         len(shifts),
    }

    return result, nil
}


// calculateHours вычисляет количество часов между двумя временами
func calculateHours(startTime, endTime string) float64 {
    // Парсим полную дату-время
    start, err := time.Parse(time.RFC3339, startTime)
    if err != nil {
        log.Printf("❌ Ошибка парсинга времени начала: %v", err)
        return 0
    }
    
    end, err := time.Parse(time.RFC3339, endTime)
    if err != nil {
        log.Printf("❌ Ошибка парсинга времени окончания: %v", err)
        return 0
    }
    
    // Если время окончания меньше времени начала, предполагаем, что смена переходит на следующий день
    if end.Before(start) {
        end = end.Add(24 * time.Hour)
    }
    
    duration := end.Sub(start)
    hours := duration.Hours()
    
    return hours // убрано округление здесь, т.к. оно есть в вызывающем коде
}

// roundToHalf округляет число до ближайшего 0.5
func roundToHalf(value float64) float64 {
    return math.Round(value*2) / 2
}



// GetWorkerChecklists получает чеклисты пользователя на определенную дату
func (s *UserService) GetWorkerChecklists(workerID int64, date string) ([]*models.Checklist, error) {
    return s.userRepo.GetWorkerChecklists(workerID, date)
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
// CalculateAllSalaries рассчитывает заработную плату за указанный месяц для всех сотрудников
func (s *UserService) CalculateAllSalaries(month string) ([]map[string]interface{}, float64, error) {
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
        salaryData, err := s.CalculateSalary(user.ID, month)
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
        
        // Добавляем фактическую зарплату к общей сумме
        if actualSalary, ok := salaryData["total_actual_salary"].(float64); ok {
            totalAmount += actualSalary
        }
    }

    return allSalaries, totalAmount, nil
}

// ExecuteHourlyChecklistsCopy выполняет копирование автосписков каждый час
func (s *UserService) ExecuteHourlyChecklistsCopy() error {
    return s.userRepo.ExecuteHourlyChecklistsCopy()
}

// DeleteSchedule удаляет расписание по ID
func (s *UserService) DeleteSchedule(scheduleID int64, UserID int64, Data string) error {
    err:= s.userRepo.DeleteSchedule(scheduleID);
    if err ==nil{
        usr, err := s.GetUserByID(UserID)
        message := fmt.Sprintf("Удалено расписание на %v", Data)
        err = s.SendTelegramNotification(*usr.ChatID, message)
        if err != nil {
            log.Printf("⚠️ Ошибка отправки уведомления работнику %d: %v", usr.ID, err)
            // Не возвращаем ошибку, так как это не критично для создания расписания
        } else {
            log.Printf("✅ Уведомление отправлено работнику %d (ChatID: %d)", usr.ID, *usr.ChatID)
        }
    }
    return err
}