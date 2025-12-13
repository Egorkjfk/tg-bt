// handlers/http.go
package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"tg-web-app-bot/models"
	"tg-web-app-bot/services"
	"time"

	
)

type HTTPHandlers struct {
	userService *services.UserService
}

func NewHTTPHandlers(userService *services.UserService) *HTTPHandlers {
	return &HTTPHandlers{
		userService: userService,
	}
}

// HandlePhoneUpdate обновляет только номер телефона пользователя
func (h *HTTPHandlers) HandlePhoneUpdate(w http.ResponseWriter, r *http.Request) {
	var phoneData struct {
		UserID      int64  `json:"user_id"`      // ID из БД
		TelegramID  int64  `json:"telegram_id"`  // Telegram ID
		PhoneNumber string `json:"phone_number"`
	}
	
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&phoneData)
	if err != nil {
		log.Printf("❌ Ошибка парсинга JSON для телефона: %v", err)
		http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
		return
	}

	log.Printf("📞 Получен запрос на обновление телефона:")
	log.Printf("👤 UserID (из БД): %d", phoneData.UserID)
	log.Printf("👤 TelegramID: %d", phoneData.TelegramID)
	log.Printf("📱 Phone: %s", phoneData.PhoneNumber)

	err = h.userService.UpdateUserPhone(phoneData.UserID, phoneData.TelegramID, phoneData.PhoneNumber)
	if err != nil {
		log.Printf("❌ Ошибка обновления телефона: %v", err)
		http.Error(w, "Ошибка обновления телефона", http.StatusInternalServerError)
		return
	}

	// Отправляем ответ
	response := map[string]interface{}{
		"status":     "success",
		"message":    "Номер телефона обновлен",
		"user_id":    phoneData.UserID,
		"telegram_id": phoneData.TelegramID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	log.Printf("✅ Номер телефона успешно обновлен для пользователя ID: %d", phoneData.UserID)
}




// HandleGetUser - поиск пользователя по ID и/или Telegram ID  
func (h *HTTPHandlers) HandleGetUser(w http.ResponseWriter, r *http.Request) {
	var requestData struct {
		UserID     *int64 `json:"user_id"`     // optional
		TelegramID int64  `json:"telegram_id"` // required
	}
	
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&requestData)
	if err != nil {
		log.Printf("❌ Ошибка парсинга JSON: %v", err)
		http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
		return
	}

	log.Printf("🔍 Получен запрос на поиск пользователя:")
	log.Printf("👤 TelegramID: %d", requestData.TelegramID)
	if requestData.UserID != nil {
		log.Printf("📋 UserID: %d", *requestData.UserID)
	}

	// Ищем пользователя
	var user *models.User
	if requestData.UserID != nil {
		// Поиск по ID и Telegram ID
		user, err = h.userService.GetUser(requestData.TelegramID, *requestData.UserID)
	} else {
		// Поиск только по Telegram ID
		user, err = h.userService.GetUser(requestData.TelegramID)
	}
	if err != nil {
		log.Printf("❌ Ошибка поиска пользователя: %v", err)
		http.Error(w, "Ошибка поиска пользователя", http.StatusInternalServerError)
		return
	}

	if user == nil {
		log.Printf("❌ Пользователь не найден")
		http.Error(w, "Пользователь не найден", http.StatusNotFound)
		return
	}

	// Отправляем полные данные пользователя
	response := map[string]interface{}{
		"status":   "success",
		"user":     user,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	log.Printf("✅ Данные пользователя отправлены: %s (ID: %d)", user.FirstName, user.ID)
}

func (h *HTTPHandlers) HandleGetAllUser(w http.ResponseWriter, r *http.Request) {
    log.Printf("🔍 Получен запрос на список пользователей:")
    
    var users[] *models.User
    err := h.userService.GetAllUser(&users)
    if err != nil {
        log.Printf("❌ Ошибка поиска пользователей: %v", err)
        http.Error(w, "Ошибка поиска пользователей", http.StatusInternalServerError)
        return
    }
    // ИСПРАВЛЕНО: используем "users" вместо "user"
    response := map[string]interface{}{
        "status": "success",
        "users":  users, // ← ключ "users" (множественное число)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
// HandleDeleteUser - удаление сотрудника
func (h *HTTPHandlers) HandleDeleteUser(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        UserID     int64 `json:"user_id"`
        AdminID    int64 `json:"admin_id"`
        TelegramID int64 `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для удаления пользователя: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя админа")
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    if !adminUser.IsAdmin {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Проверяем, что администратор не пытается удалить самого себя
    if requestData.UserID == requestData.AdminID {
        log.Printf("❌ Администратор не может удалить самого себя")
        http.Error(w, "Администратор не может удалить самого себя", http.StatusBadRequest)
        return
    }

    // Получаем информацию о пользователе, которого собираемся удалить
    userToDelete, err := h.userService.GetUserByID(requestData.UserID)
    if err != nil || userToDelete == nil {
        log.Printf("❌ Пользователь с ID %d не найден", requestData.UserID)
        http.Error(w, "Пользователь не найден", http.StatusNotFound)
        return
    }

    // Проверяем, что мы не пытаемся удалить другого администратора
    if userToDelete.IsAdmin {
        log.Printf("❌ Нельзя удалить другого администратора")
        http.Error(w, "Нельзя удалить другого администратора", http.StatusForbidden)
        return
    }

    // Удаляем пользователя
    err = h.userService.DeleteUser(requestData.UserID)
    if err != nil {
        log.Printf("❌ Ошибка удаления пользователя: %v", err)
        http.Error(w, "Ошибка удаления пользователя", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": fmt.Sprintf("Пользователь %s (ID: %d) успешно удален", 
            userToDelete.FirstName + " " + userToDelete.LastName, 
            requestData.UserID),
        "deleted_user": map[string]interface{}{
            "id":         userToDelete.ID,
            "username":   userToDelete.Username,
            "first_name": userToDelete.FirstName,
            "last_name":  userToDelete.LastName,
            "telegram_id": userToDelete.TelegramID,
        },
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Пользователь ID=%d успешно удален администратором ID=%d", 
        requestData.UserID, requestData.AdminID)
}

// HandleGetAllZones - получение всех зон
func (h *HTTPHandlers) HandleGetAllZones(w http.ResponseWriter, r *http.Request) {
    log.Printf("🔍 Получен запрос на список зон")

    var zones []*models.Zone
    err := h.userService.GetAllZones(&zones)
    if err != nil {
        log.Printf("❌ Ошибка получения зон: %v", err)
        http.Error(w, "Ошибка получения зон", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status": "success",
        "zones":  zones,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Список зон отправлен, количество: %d", len(zones))
}

// HandleCreateZone - создание новой зоны
func (h *HTTPHandlers) HandleCreateZone(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        Name         string  `json:"name"`
        Description  string  `json:"description"`
        WorkingHours string  `json:"working_hours"`
        ImagePath    string  `json:"image_path"`
        Price        *float64 `json:"price"`
        AdminID      int64   `json:"admin_id"`
        AdminTgId    int64   `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    log.Printf("➕ Получен запрос на создание зоны:")
    log.Printf("📝 Название: %s", requestData.Name)
    log.Printf("📋 Описание: %s", requestData.Description)
    log.Printf("⏰ Рабочие часы: %s", requestData.WorkingHours)
    log.Printf("🖼️ Путь к изображению: %s", requestData.ImagePath)
    if requestData.Price != nil {
        log.Printf("💰 Цена: %f", *requestData.Price)
    } else {
        log.Printf("💰 Цена: не указана")
    }
    log.Printf("👤 AdminID: %d", requestData.AdminID)
    log.Printf("👤 AdminTgId: %d", requestData.AdminTgId)

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
    log.Printf("✅ Данные пользователя отправлены: %s (ID: %d)", adminUser.FirstName, adminUser.ID)
    if err != nil || adminUser == nil {
        log.Printf("❌ ОШИБКА")
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Создаем зону
    zone := &models.Zone{
        Name:         requestData.Name,
        Description:  &requestData.Description,
        WorkingHours: requestData.WorkingHours,
        ImagePath:    requestData.ImagePath,
        Price:        requestData.Price,
    }

    err = h.userService.CreateZone(zone)
    if err != nil {
        log.Printf("❌ Ошибка создания зоны: %v", err)
        http.Error(w, "Ошибка создания зоны", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Зона успешно создана",
        "zone_id": zone.ID,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Зона успешно создана с ID: %d", zone.ID)
}

// HandleUpdateZone - обновление зоны
func (h *HTTPHandlers) HandleUpdateZone(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        ZoneID  int64                  `json:"zone_id"`
        AdminID int64                  `json:"admin_id"`
				AdminTgId int64								 `json:"telegram_id"`
        Updates map[string]interface{} `json:"updates"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
		log.Printf("✅ Данные пользователя отправлены: %s (ID: %d)", adminUser.FirstName, adminUser.ID)
    if err != nil || adminUser == nil {
        log.Printf("❌ ОШИБКА")
        return
    }
		if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }
		

    // Обновляем зону
    err = h.userService.UpdateZone(requestData.ZoneID, requestData.Updates)
    if err != nil {
        log.Printf("❌ Ошибка обновления зоны: %v", err)
        http.Error(w, "Ошибка обновления зоны", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Зона успешно обновлена",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}


// HandleDropZone - удаляет зону
func (h *HTTPHandlers) HandleDropZone(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        ZoneID      int64  `json:"zone_id"`
        AdminID     int64  `json:"admin_id"`
        AdminTgId   int64  `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для создания чеклиста: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    log.Printf("➕ Получен запрос на удаление зоны:")
    log.Printf("📍 ZoneID: %d", requestData.ZoneID)
    log.Printf("👤 AdminID: %d", requestData.AdminID)
    log.Printf("👤 AdminTgId: %d", requestData.AdminTgId)

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя админа")
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    if !adminUser.IsAdmin {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    err = h.userService.DropZone(requestData.ZoneID)
    if err != nil {
        log.Printf("❌ Ошибка удаления зоны: %v", err)
        http.Error(w, "Ошибка удаления зоны", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Зона успешно удалена",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Зона успешно удалена для зоны ID=%d", requestData.ZoneID)
}


// HandleGetChecklists - получение чеклистов с фильтрацией
func (h *HTTPHandlers) HandleGetChecklists(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        Date      string `json:"date"`
        ZoneID    *int64 `json:"zone_id,omitempty"`
        AdminID   int64  `json:"admin_id"`
        AdminTgId int64  `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для получения чеклистов: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    log.Printf("🔍 Получен запрос на получение чеклистов:")
    log.Printf("📅 Дата: %s", requestData.Date)
    if requestData.ZoneID != nil {
        log.Printf("📍 ZoneID: %d", *requestData.ZoneID)
    }
    log.Printf("👤 AdminID: %d", requestData.AdminID)
    log.Printf("👤 AdminTgId: %d", requestData.AdminTgId)

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя админа")
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    if !adminUser.IsAdmin {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Получаем чеклисты
    checklists, err := h.userService.GetChecklists(requestData.Date, requestData.ZoneID)
    if err != nil {
        log.Printf("❌ Ошибка получения чеклистов: %v", err)
        http.Error(w, "Ошибка получения чеклистов", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":     "success",
        "checklists": checklists,
        "count":      len(checklists),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Список чеклистов отправлен, количество: %d", len(checklists))
}

// // HandleUpdateChecklist - обновление чеклиста
// func (h *HTTPHandlers) HandleUpdateChecklist(w http.ResponseWriter, r *http.Request) {
//     var requestData struct {
//         ChecklistID int64  `json:"checklist_id"`
//         Photo       string `json:"photo"`
//         AdminID     int64 `json:"admin_id"`
//         AdminTgId   int64  `json:"telegram_id"`
//     }
    
//     decoder := json.NewDecoder(r.Body)
//     err := decoder.Decode(&requestData)
//     if err != nil {
//         log.Printf("❌ Ошибка парсинга JSON для обновления чеклиста: %v", err)
//         http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
//         return
//     }

//     log.Printf("✏️ Получен запрос на обновление чеклиста:")
//     log.Printf("📋 ChecklistID: %d", requestData.ChecklistID)
//     log.Printf("🖼️ Photo: %s", requestData.Photo)
//     log.Printf("👤 AdminID: %d", requestData.AdminID)
//     log.Printf("👤 AdminTgId: %d", requestData.AdminTgId)

//     // Проверяем, что пользователь является админом
//     adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
//     if err != nil || adminUser == nil {
//         log.Printf("❌ Ошибка получения пользователя админа")
//         http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
//         return
//     }
    
//     if !adminUser.IsAdmin {
//         log.Printf("❌ Пользователь не является администратором")
//         http.Error(w, "Недостаточно прав", http.StatusForbidden)
//         return
//     }

//     // Обновляем чеклист
//     err = h.userService.UpdateChecklist(requestData.ChecklistID, requestData.Photo)
//     if err != nil {
//         log.Printf("❌ Ошибка обновления чеклиста: %v", err)
//         http.Error(w, "Ошибка обновления чеклиста", http.StatusInternalServerError)
//         return
//     }

//     response := map[string]interface{}{
//         "status":  "success",
//         "message": "Чеклист успешно обновлен",
//     }

//     w.Header().Set("Content-Type", "application/json")
//     json.NewEncoder(w).Encode(response)
//     log.Printf("✅ Чеклист ID=%d успешно обновлен", requestData.ChecklistID)
// }

// HandleUpdateChecklistConfirmed - обновление статуса подтверждения чеклиста
func (h *HTTPHandlers) HandleUpdateChecklistConfirmed(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        ChecklistID int64 `json:"checklist_id"`
        Confirmed   bool  `json:"confirmed"`
        AdminID     int64 `json:"admin_id"`
        AdminTgId   int64 `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для обновления подтверждения чеклиста: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    log.Printf("✏️ Получен запрос на обновление подтверждения чеклиста:")
         log.Printf("📋 ChecklistID: %d", requestData.ChecklistID)
         log.Printf("✅ Confirmed: %t", requestData.Confirmed)
         log.Printf("👤 AdminID: %d", requestData.AdminID)
         log.Printf("👤 AdminTgId: %d", requestData.AdminTgId)
    
         // Проверяем права доступа: пользователь должен быть админом ИЛИ обновлять свой собственный чек-лист
         requestingUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
         if err != nil || requestingUser == nil {
             log.Printf("❌ Ошибка получения пользователя: %v", err)
             http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
             return
         }
    
         // Разрешаем доступ если:
         // 1. Пользователь является администратором, ИЛИ
         // 2. Пользователь обновляет свой собственный чек-лист (WorkerID == AdminID)
         if !requestingUser.IsAdmin {
             // Получаем информацию о чек-листе, чтобы проверить, принадлежит ли оно пользователю
             checklist, err := h.userService.GetChecklistByID(requestData.ChecklistID)
             if err != nil || checklist == nil {
                 log.Printf("❌ Ошибка получения чек-листа: %v", err)
                 http.Error(w, "Чек-лист не найден", http.StatusNotFound)
                 return
             }
             
             // В текущей архитектуре БД между чеклистами и расписаниями нет прямой связи
             // Проверяем, является ли пользователь владельцем чеклиста, сравнивая AdminID
             if *checklist.AdminID != requestData.AdminID {
                 log.Printf("❌ Недостаточно прав: пользователь %d не является владельцем чек-листа %d", requestData.AdminID, checklist.ID)
                 http.Error(w, "Недостаточно прав", http.StatusForbidden)
                 return
             }
         }
    
         // Обновляем статус подтверждения чеклиста
         err = h.userService.UpdateChecklistConfirmed(requestData.ChecklistID, requestData.Confirmed)
         if err != nil {
             log.Printf("❌ Ошибка обновления подтверждения чеклиста: %v", err)
             http.Error(w, "Ошибка обновления подтверждения чеклиста", http.StatusInternalServerError)
             return
         }
    
         response := map[string]interface{}{
             "status":  "success",
             "message": "Статус подтверждения чеклиста успешно обновлен",
         }
    
         w.Header().Set("Content-Type", "application/json")
         json.NewEncoder(w).Encode(response)
         log.Printf("✅ Статус подтверждения чеклиста ID=%d успешно обновлен", requestData.ChecklistID)
}

// HandleUpdateChecklistStatus - обновление статуса выполнения чеклиста
func (h *HTTPHandlers) HandleUpdateChecklistStatus(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        ChecklistID int64 `json:"checklist_id"`
        Status      bool  `json:"status"`
        UserID     int64 `json:"user_id"`
        UserTgId   int64 `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для обновления статуса чеклиста: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }
    // Проверяем, что чеклист принадлежит пользователю - ВСЁ В ОДНОМ ЗАПРОСЕ!
    checklist, err := h.userService.GetWorkerChecklistByID(requestData.UserID, requestData.ChecklistID)
    if err != nil || checklist == nil {
        log.Printf("❌ Чеклист ID=%d не принадлежит пользователю ID=%d или не существует: %v", 
            requestData.ChecklistID, requestData.UserID, err)
        http.Error(w, "Чеклист не найден или недостаточно прав", http.StatusForbidden)
        return
    }
    checklist.Status = requestData.Status;

    // Обновляем статус выполнения чеклиста
    err = h.userService.UpdateChecklistStatus(checklist)
    if err != nil {
        log.Printf("❌ Ошибка обновления статуса чеклиста: %v", err)
        http.Error(w, "Ошибка обновления статуса чеклиста", http.StatusInternalServerError)
        return
    }
    
    response := map[string]interface{}{
        "status":  "success",
        "message": "Статус выполнения чеклиста успешно обновлен",
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Статус выполнения чеклиста ID=%d успешно обновлен", requestData.ChecklistID)
}

// HandleUpdateChecklistDescription - обновление описания чеклиста
func (h *HTTPHandlers) HandleUpdateChecklistDescription(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        ChecklistID int64  `json:"checklist_id"`
        Description string `json:"description"`
        AdminID     int64  `json:"admin_id"`
        AdminTgId   int64  `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для обновления описания чеклиста: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    log.Printf("✏️ Получен запрос на обновление описания чеклиста:")
    log.Printf("📋 ChecklistID: %d", requestData.ChecklistID)
    log.Printf("📝 Description: %s", requestData.Description)
    log.Printf("👤 AdminID: %d", requestData.AdminID)
    log.Printf("👤 AdminTgId: %d", requestData.AdminTgId)

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя админа")
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    if !adminUser.IsAdmin {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Обновляем описание чеклиста
    err = h.userService.UpdateChecklistDescription(requestData.ChecklistID, requestData.Description)
    if err != nil {
        log.Printf("❌ Ошибка обновления описания чеклиста: %v", err)
        http.Error(w, "Ошибка обновления описания чеклиста", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Описание чеклиста успешно обновлено",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Описание чеклиста ID=%d успешно обновлено", requestData.ChecklistID)
}

// HandleDeleteChecklist - удаление чеклиста
func (h *HTTPHandlers) HandleDeleteChecklist(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        ChecklistID int64 `json:"checklist_id"`
        AdminID     int64 `json:"admin_id"`
        AdminTgId   int64 `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для удаления чеклиста: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    log.Printf("🗑️ Получен запрос на удаление чеклиста:")
    log.Printf("📋 ChecklistID: %d", requestData.ChecklistID)
    log.Printf("👤 AdminID: %d", requestData.AdminID)
    log.Printf("👤 AdminTgId: %d", requestData.AdminTgId)

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя админа")
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    if !adminUser.IsAdmin {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Удаляем чеклист
    err = h.userService.DeleteChecklist(requestData.ChecklistID)
    if err != nil {
        log.Printf("❌ Ошибка удаления чеклиста: %v", err)
        http.Error(w, "Ошибка удаления чеклиста", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Чеклист успешно удален",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Чеклист ID=%d успешно удален", requestData.ChecklistID)
}

// HandleCreateChecklist - создание нового чеклиста
func (h *HTTPHandlers) HandleCreateChecklist(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        ZoneID      int64  `json:"zone_id"`
        Description string `json:"description"`
        AdminID     int64  `json:"admin_id"`
        AdminTgId   int64  `json:"telegram_id"`
        Important   bool   `json:"important"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для создания чеклиста: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    log.Printf("➕ Получен запрос на создание чеклиста:")
    log.Printf("📍 ZoneID: %d", requestData.ZoneID)
    log.Printf("📝 Description: %s", requestData.Description)
    log.Printf("👤 AdminID: %d", requestData.AdminID)
    log.Printf("👤 AdminTgId: %d", requestData.AdminTgId)

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя админа")
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    if !adminUser.IsAdmin {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Создаем чеклист
    err = h.userService.CreateChecklist(requestData.ZoneID, requestData.Description, requestData.AdminID, requestData.Important)
    if err != nil {
        log.Printf("❌ Ошибка создания чеклиста: %v", err)
        http.Error(w, "Ошибка создания чеклиста", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Чеклист успешно создан",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Чеклист успешно создан для зоны ID=%d", requestData.ZoneID)
}


// HandleCreateAutoChecklist - создание нового авто-чеклиста
func (h *HTTPHandlers) HandleCreateAutoChecklist(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        ZoneID      int64  `json:"zone_id"`
        Description string `json:"description"`
        Important   bool       `json:"important"`
        AdminID     int64  `json:"admin_id"`
        AdminTgId   int64  `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для создания чеклиста: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя админа")
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    if !adminUser.IsAdmin {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    autochek := &models.Auto_cheklst{
        ZoneID:      requestData.ZoneID,
        Description: requestData.Description,
        Important: requestData.Important,
    }

    // Создаем чеклист
    err = h.userService.CreateAutoChecklist(autochek)
    if err != nil {
        log.Printf("❌ Ошибка создания авто-чеклиста: %v", err)
        http.Error(w, "Ошибка создания авто-чеклиста", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "autochek": autochek,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Авто-Чеклист успешно создан для зоны ID=%d", requestData.ZoneID)
}

// HandleDeleteAutoChecklist - создание нового авто-чеклиста
func (h *HTTPHandlers) HandleDeleteAutoChecklist(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        AutoZoneID  int64  `json:"zone_id"`
        AdminID     int64  `json:"admin_id"`
        AdminTgId   int64  `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для создания чеклиста: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя админа")
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    if !adminUser.IsAdmin {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Создаем чеклист
    err = h.userService.DeletAutoChecklist(requestData.AutoZoneID)
    if err != nil {
        log.Printf("❌ Ошибка удаления авто-чеклиста: %v", err)
        http.Error(w, "Ошибка удаления авто-чеклиста", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Авто-Чеклист успешно удалён для зоны ID=%d", requestData.AutoZoneID)
}

func (h *HTTPHandlers) HandleGetAutoChecklists(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        ZoneID    int64 `json:"zone_id"`
        AdminID   int64  `json:"admin_id"`
        AdminTgId int64  `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для получения чеклистов: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя админа")
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    if !adminUser.IsAdmin {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Получаем чеклисты
    checklists, err := h.userService.GetAutoChecklists(requestData.ZoneID)
    if err != nil {
        log.Printf("❌ Ошибка получения чеклистов: %v", err)
        http.Error(w, "Ошибка получения авточеклистов", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":     "success",
        "checklists": checklists,
        "count":      len(checklists),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Список авточеклистов отправлен, количество: %d", len(checklists))
}

// HandleUpdateAutoChecklist - обновление авто-чеклиста
func (h *HTTPHandlers) HandleUpdateAutoChecklist(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        AutoChecklistID int64  `json:"auto_checklist_id"`
        Description     string `json:"description"`
        Important       bool   `json:"important"`
        AdminID         int64  `json:"admin_id"`
        AdminTgId       int64  `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для обновления авто-чеклиста: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }


    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя админа")
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    if !adminUser.IsAdmin {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Обновляем авто-чеклист
    err = h.userService.UpdateAutoChecklist(requestData.AutoChecklistID, requestData.Description, requestData.Important)
    if err != nil {
        log.Printf("❌ Ошибка обновления авто-чеклиста: %v", err)
        http.Error(w, "Ошибка обновления авто-чеклиста", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Авто-чеклист успешно обновлен",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Авто-чеклист ID=%d успешно обновлен", requestData.AutoChecklistID)
}

//---------------------------------------------------------------

// HandleCreateSchedule - создание новой записи расписания
func (h *HTTPHandlers) HandleCreateSchedule(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        WorkerID         int64    `json:"worker_id"`
        ZoneID           int64    `json:"zone_id"`
        Date             string   `json:"date"` // для совместимости с существующим кодом
        Dates            []string `json:"dates"` // для возможности передачи нескольких дат
        PlannedStartTime string   `json:"planned_start_time"`
        PlannedEndTime   string   `json:"planned_end_time"`
        AdminID          int64    `json:"admin_id"`
        TelegramID       int64    `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Определяем, какие даты использовать - из поля Date или из массива Dates
    datesToUse := []string{}
    if len(requestData.Dates) > 0 {
        datesToUse = requestData.Dates
    } else if requestData.Date != "" {
        datesToUse = []string{requestData.Date}
    } else {
        log.Printf("❌ Не указана ни одна дата")
        http.Error(w, "Не указана дата", http.StatusBadRequest)
        return
    }

    // Создаем расписания для каждой даты
    createdSchedules := []*models.Schedule{}
    for _, date := range datesToUse {
        schedule := &models.Schedule{
            WorkerID:         requestData.WorkerID,
            ZoneID:           &requestData.ZoneID,
            Date:             date,
            PlannedStartTime: requestData.PlannedStartTime,
            PlannedEndTime:   requestData.PlannedEndTime,
        }

        err = h.userService.CreateSchedule(schedule)
        if err != nil {
            log.Printf("❌ Ошибка создания расписания для даты %s: %v", date, err)
            http.Error(w, "Ошибка создания расписания", http.StatusInternalServerError)
            return
        }

        createdSchedules = append(createdSchedules, schedule)
    }

    response := map[string]interface{}{
        "status":    "success",
        "schedules": createdSchedules,
        "count":     len(createdSchedules),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleUpdateActualStartTime - обновление времени начала работы
func (h *HTTPHandlers) HandleUpdateActualStartTime(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        ScheduleID int64  `json:"schedule_id"`
        Time       string `json:"time"`
        PhotoData string `json:"photo_data,omitempty"` // Новое поле для фото
        AdminID    int64 `json:"admin_id"`
        TelegramID int64  `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем права доступа: пользователь должен быть админом ИЛИ обновлять свое собственное расписание
         requestingUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
         if err != nil || requestingUser == nil {
             log.Printf("❌ Ошибка получения пользователя: %v", err)
             http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
             return
         }
    
         // Получаем информацию о расписании, чтобы проверить, принадлежит ли оно пользователю
         schedule, err := h.userService.GetScheduleByID(requestData.ScheduleID)
         if err != nil || schedule == nil {
             log.Printf("❌ Ошибка получения расписания: %v", err)
             http.Error(w, "Расписание не найдено", http.StatusNotFound)
             return
         }
    
         // Разрешаем доступ если:
         // 1. Пользователь является администратором, ИЛИ
         // 2. Пользователь обновляет свое собственное расписание (WorkerID == AdminID)
         if !requestingUser.IsAdmin && schedule.WorkerID != requestData.AdminID {
             log.Printf("❌ Недостаточно прав: пользователь %d не является админом и пытается обновить чужое расписание %d", requestData.AdminID, schedule.WorkerID)
             http.Error(w, "Недостаточно прав", http.StatusForbidden)
             return
         }

    err = h.userService.UpdateActualStartTime(requestData.ScheduleID, requestData.Time)
    if err != nil {
        log.Printf("❌ Ошибка обновления времени начала: %v", err)
        http.Error(w, "Ошибка обновления времени начала", http.StatusInternalServerError)
        return
    }

    // Если есть фото, обновляем поле photo_start
    if requestData.PhotoData != "" {
        // Создаем директорию для изображений смен, если её нет
        imagesDir := "./public/smena"
        if _, err := os.Stat(imagesDir); os.IsNotExist(err) {
            err := os.MkdirAll(imagesDir, 0755)
            if err != nil {
                log.Printf("❌ Ошибка создания директории: %v", err)
                http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
                return
            }
        }

        // Разделяем строку с фото по запятой, если их несколько
        photoDataList := strings.Split(requestData.PhotoData, ",")

        // Обрабатываем каждое фото
        var photoPaths []string
        for i, photoData := range photoDataList {
            // Убираем лишние пробелы
            photoData = strings.TrimSpace(photoData)
            if photoData == "" {
                continue
            }

            // Декодируем Base64 строку в бинарные данные
            photoBytes, err := base64.StdEncoding.DecodeString(photoData)
            if err != nil {
                log.Printf("❌ Ошибка декодирования Base64: %v", err)
                http.Error(w, "Некорректные данные фото", http.StatusBadRequest)
                return
            }

            // Генерируем уникальное имя файла
            fileExt := ".jpg" // Предполагаем, что фото в формате JPEG
            newFileName := fmt.Sprintf("smena_start_%d_%d_%d%s", requestData.ScheduleID, time.Now().Unix(), i, fileExt)
            filePath := filepath.Join(imagesDir, newFileName)

            // Создаем файл на сервере
            dst, err := os.Create(filePath)
            if err != nil {
                log.Printf("❌ Ошибка создания файла: %v", err)
                http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
                return
            }
            defer dst.Close()

            // Записываем бинарные данные фото в файл
            if _, err := dst.Write(photoBytes); err != nil {
                log.Printf("❌ Ошибка записи файла: %v", err)
                http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
                return
            }

            // Формируем путь для доступа через веб
            webPath := fmt.Sprintf("/smena/%s", newFileName)
            photoPaths = append(photoPaths, webPath)
        }

        // Объединяем все пути к фото в одну строку с запятой как разделителем
        finalPhotoPath := strings.Join(photoPaths, ",")

        // Обновляем фото начала смены
        err = h.userService.UpdatePhotoStart(requestData.ScheduleID, finalPhotoPath)
        if err != nil {
            log.Printf("❌ Ошибка обновления фото начала смены: %v", err)
            http.Error(w, "Ошибка обновления фото начала смены", http.StatusInternalServerError)
            return
        }
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Время начала обновлено",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleUpdateActualEndTime - обновление времени окончания работы
func (h *HTTPHandlers) HandleUpdateActualEndTime(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        ScheduleID int64  `json:"schedule_id"`
        Time       string `json:"time"`
        PhotoData string `json:"photo_data,omitempty"` // Новое поле для фото
        AdminID    int64 `json:"admin_id"`
        TelegramID int64 `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем права доступа: пользователь должен быть админом ИЛИ обновлять свое собственное расписание
         requestingUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
         if err != nil || requestingUser == nil {
             log.Printf("❌ Ошибка получения пользователя: %v", err)
             http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
             return
         }
    
         // Получаем информацию о расписании, чтобы проверить, принадлежит ли оно пользователю
         schedule, err := h.userService.GetScheduleByID(requestData.ScheduleID)
         if err != nil || schedule == nil {
             log.Printf("❌ Ошибка получения расписания: %v", err)
             http.Error(w, "Расписание не найдено", http.StatusNotFound)
             return
         }
    
         // Разрешаем доступ если:
         // 1. Пользователь является администратором, ИЛИ
         // 2. Пользователь обновляет свое собственное расписание (WorkerID == AdminID)
         if !requestingUser.IsAdmin && schedule.WorkerID != requestData.AdminID {
             log.Printf("❌ Недостаточно прав: пользователь %d не является админом и пытается обновить чужое расписание %d", requestData.AdminID, schedule.WorkerID)
             http.Error(w, "Недостаточно прав", http.StatusForbidden)
             return
         }

    err = h.userService.UpdateActualEndTime(requestData.ScheduleID, requestData.Time)
    if err != nil {
        log.Printf("❌ Ошибка обновления времени окончания: %v", err)
        http.Error(w, "Ошибка обновления времени окончания", http.StatusInternalServerError)
        return
    }

    // Если есть фото, обновляем поле photo_end
    if requestData.PhotoData != "" {
        // Создаем директорию для изображений смен, если её нет
        imagesDir := "./public/smena"
        if _, err := os.Stat(imagesDir); os.IsNotExist(err) {
            err := os.MkdirAll(imagesDir, 0755)
            if err != nil {
                log.Printf("❌ Ошибка создания директории: %v", err)
                http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
                return
            }
        }

        // Разделяем строку с фото по запятой, если их несколько
        photoDataList := strings.Split(requestData.PhotoData, ",")

        // Обрабатываем каждое фото
        var photoPaths []string
        for i, photoData := range photoDataList {
            // Убираем лишние пробелы
            photoData = strings.TrimSpace(photoData)
            if photoData == "" {
                continue
            }

            // Декодируем Base64 строку в бинарные данные
            photoBytes, err := base64.StdEncoding.DecodeString(photoData)
            if err != nil {
                log.Printf("❌ Ошибка декодирования Base64: %v", err)
                http.Error(w, "Некорректные данные фото", http.StatusBadRequest)
                return
            }

            // Генерируем уникальное имя файла
            fileExt := ".jpg" // Предполагаем, что фото в формате JPEG
            newFileName := fmt.Sprintf("smena_end_%d_%d_%d%s", requestData.ScheduleID, time.Now().Unix(), i, fileExt)
            filePath := filepath.Join(imagesDir, newFileName)

            // Создаем файл на сервере
            dst, err := os.Create(filePath)
            if err != nil {
                log.Printf("❌ Ошибка создания файла: %v", err)
                http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
                return
            }
            defer dst.Close()

            // Записываем бинарные данные фото в файл
            if _, err := dst.Write(photoBytes); err != nil {
                log.Printf("❌ Ошибка записи файла: %v", err)
                http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
                return
            }

            // Формируем путь для доступа через веб
            webPath := fmt.Sprintf("/smena/%s", newFileName)
            photoPaths = append(photoPaths, webPath)
        }

        // Объединяем все пути к фото в одну строку с запятой как разделителем
        finalPhotoPath := strings.Join(photoPaths, ",")

        // Обновляем фото окончания смены
        err = h.userService.UpdatePhotoEnd(requestData.ScheduleID, finalPhotoPath)
        if err != nil {
            log.Printf("❌ Ошибка обновления фото окончания смены: %v", err)
            http.Error(w, "Ошибка обновления фото окончания смены", http.StatusInternalServerError)
            return
        }
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Время окончания обновлено",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleGetWorkerWeeklySchedule - получение расписания на неделю для работника
func (h *HTTPHandlers) HandleGetWorkerWeeklySchedule(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        WorkerID   int64 `json:"worker_id"`
        WeekOffset int   `json:"week_offset"` // 0 - текущая неделя, 1 - следующая, -1 - предыдущая
        AdminID    int64 `json:"admin_id"`
        TelegramID int64 `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем права доступа: пользователь должен быть админом ИЛИ запрашивать свое собственное расписание
         requestingUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
         if err != nil || requestingUser == nil {
             log.Printf("❌ Ошибка получения пользователя: %v", err)
             http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
             return
         }
    
         // Разрешаем доступ если:
         // 1. Пользователь является администратором, ИЛИ
         // 2. Пользователь запрашивает свое собственное расписание (WorkerID == AdminID)
         if !requestingUser.IsAdmin && requestData.WorkerID != requestData.AdminID {
             log.Printf("❌ Недостаточно прав: пользователь %d не является админом и запрашивает расписание другого работника %d", requestData.AdminID, requestData.WorkerID)
             http.Error(w, "Недостаточно прав", http.StatusForbidden)
             return
         }

    schedules, err := h.userService.GetWorkerWeeklySchedule(requestData.WorkerID, requestData.WeekOffset)
    if err != nil {
        log.Printf("❌ Ошибка получения расписания: %v", err)
        http.Error(w, "Ошибка получения расписания", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":    "success",
        "schedules": schedules,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleGetAllWorkersWeeklySchedule - получение расписания всех работников на неделю
func (h *HTTPHandlers) HandleGetAllWorkersWeeklySchedule(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        WeekOffset int   `json:"week_offset"` // 0 - текущая неделя, 1 - следующая, -1 - предыдущая
        AdminID    int64 `json:"admin_id"`
        TelegramID int64 `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    schedules, err := h.userService.GetAllWorkersWeeklySchedule(requestData.WeekOffset)
    if err != nil {
        log.Printf("❌ Ошибка получения расписания: %v", err)
        http.Error(w, "Ошибка получения расписания", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":    "success",
        "schedules": schedules,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
  
   // HandleUpdateUserConfirmed - обновление статуса подтверждения пользователя
   func (h *HTTPHandlers) HandleUpdateUserConfirmed(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
    	UserID     int64 `json:"user_id"`
    	Confirmed  bool  `json:"confirmed"`
    	AdminID    int64 `json:"admin_id"`
    	TelegramID int64 `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
    	log.Printf("❌ Ошибка парсинга JSON для обновления подтверждения пользователя: %v", err)
    	http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
    	return
    }
  
    log.Printf("✏️ Получен запрос на обновление подтверждения пользователя:")
         log.Printf("📋 UserID: %d", requestData.UserID)
         log.Printf("✅ Confirmed: %t", requestData.Confirmed)
         log.Printf("👤 AdminID: %d", requestData.AdminID)
         log.Printf("👤 TelegramID: %d", requestData.TelegramID)
    
         // Проверяем права доступа: пользователь должен быть админом ИЛИ обновлять свой собственный статус
         requestingUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
         if err != nil || requestingUser == nil {
             log.Printf("❌ Ошибка получения пользователя: %v", err)
             http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
             return
         }
    
         // Разрешаем доступ если:
         // 1. Пользователь является администратором, ИЛИ
         // 2. Пользователь обновляет свой собственный статус (UserID == AdminID)
         if !requestingUser.IsAdmin && requestData.UserID != requestData.AdminID {
             log.Printf("❌ Недостаточно прав: пользователь %d не является админом и пытается обновить статус другого пользователя %d", requestData.AdminID, requestData.UserID)
             http.Error(w, "Недостаточно прав", http.StatusForbidden)
             return
         }
    
         // Обновляем статус подтверждения пользователя
         err = h.userService.UpdateUserConfirmed(requestData.UserID, requestData.Confirmed)
         if err != nil {
             log.Printf("❌ Ошибка обновления подтверждения пользователя: %v", err)
             http.Error(w, "Ошибка обновления подтверждения пользователя", http.StatusInternalServerError)
             return
         }
    
         response := map[string]interface{}{
             "status":  "success",
             "message": "Статус подтверждения пользователя успешно обновлен",
         }
    
         w.Header().Set("Content-Type", "application/json")
         json.NewEncoder(w).Encode(response)
         log.Printf("✅ Статус подтверждения пользователя ID=%d успешно обновлен", requestData.UserID)
   }
  
   // HandleUploadZoneImage - загрузка изображения для зоны
   func (h *HTTPHandlers) HandleUploadZoneImage(w http.ResponseWriter, r *http.Request) {
   	// Ограничиваем размер загружаемого файла до 10MB
   	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
   	
   	// Парсим multipart form с максимальной памятью 32MB
   	if err := r.ParseMultipartForm(32 << 20); err != nil {
   	log.Printf("❌ Ошибка парсинга формы: %v", err)
   	http.Error(w, "Ошибка парсинга формы", http.StatusBadRequest)
   		return
   	}
   
   	// Получаем файл из формы
   	file, handler, err := r.FormFile("zone") // Изменено: теперь ожидаем "zone" вместо "image"
   	if err != nil {
   		log.Printf("❌ Ошибка получения файла: %v", err)
   		http.Error(w, "Ошибка получения файла", http.StatusBadRequest)
   		return
   	}
   	defer file.Close()
   
   	// Проверяем тип файла
   	buffer := make([]byte, 512)
   	_, err = file.Read(buffer)
   	if err != nil {
   		log.Printf("❌ Ошибка чтения файла: %v", err)
   	http.Error(w, "Ошибка чтения файла", http.StatusBadRequest)
   		return
   	}
   	
   	// Возвращаем указатель файла в начало
   	file.Seek(0, 0)
   	
   	contentType := http.DetectContentType(buffer)
   	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/gif" {
   	log.Printf("❌ Неподдерживаемый тип файла: %s", contentType)
   		http.Error(w, "Неподдерживаемый тип файла. Разрешены только JPG, PNG, GIF", http.StatusBadRequest)
   		return
   	}
   
   	// Получаем ID зоны
   	zoneID := r.FormValue("zone_id")
   	if zoneID == "" {
   	log.Printf("❌ Не указан ID зоны")
   		http.Error(w, "Не указан ID зоны", http.StatusBadRequest)
   		return
   	}
   
   	// Конвертируем ID зоны в число
   	zoneId, err := strconv.ParseInt(zoneID, 10, 64)
   	if err != nil {
   	log.Printf("❌ Некорректный ID зоны: %v", err)
   		http.Error(w, "Некорректный ID зоны", http.StatusBadRequest)
   		return
   	}
   
   	// Создаем директорию для изображений, если её нет
   	imagesDir := "./public/zones"
   	if _, err := os.Stat(imagesDir); os.IsNotExist(err) {
   		err := os.MkdirAll(imagesDir, 0755)
   	if err != nil {
   			log.Printf("❌ Ошибка создания директории: %v", err)
   			http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
   			return
   		}
   	}
   
   	// Генерируем уникальное имя файла
   	fileExt := filepath.Ext(handler.Filename)
   	newFileName := fmt.Sprintf("%d_%d%s", zoneId, time.Now().Unix(), fileExt)
   	filePath := filepath.Join(imagesDir, newFileName)
   
   	// Создаем файл на сервере
   	dst, err := os.Create(filePath)
   	if err != nil {
   		log.Printf("❌ Ошибка создания файла: %v", err)
   		http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
   		return
   	}
   	defer dst.Close()
   
   	// Копируем загруженный файл в созданный файл
   	if _, err := io.Copy(dst, file); err != nil {
   		log.Printf("❌ Ошибка копирования файла: %v", err)
   		http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
   		return
   	}
   
   	// Формируем путь для доступа через веб
   	webPath := fmt.Sprintf("/zones/%s", newFileName)
   
   	response := map[string]interface{}{
   		"status":     "success",
   		"message":    "Изображение успешно загружено",
   		"image_path": webPath,
   	}
   
   	w.Header().Set("Content-Type", "application/json")
   	json.NewEncoder(w).Encode(response)
   	log.Printf("✅ Изображение успешно загружено для зоны ID=%d: %s", zoneId, webPath)
   }

// HandleGetWorkerChecklists - получение чеклистов пользователя на определенную дату
func (h *HTTPHandlers) HandleGetWorkerChecklists(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        WorkerID   int64  `json:"worker_id"`
        Date       string `json:"date"`
        TelegramID int64  `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для получения чеклистов пользователя: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    log.Printf("🔍 Получен запрос на получение чеклистов пользователя:")
    log.Printf("👤 WorkerID: %d", requestData.WorkerID)
    log.Printf("📅 Дата: %s", requestData.Date)
    log.Printf("👤 TelegramID: %d", requestData.TelegramID)

    // Проверяем, что пользователь запрашивает свои чеклисты
    requestingUser, err := h.userService.GetUser(requestData.TelegramID, requestData.WorkerID)
    if err != nil || requestingUser == nil {
        log.Printf("❌ Ошибка получения пользователя")
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    // Разрешаем доступ если:
    // 1. Пользователь является администратором, ИЛИ
    // 2. Пользователь запрашивает свои собственные чеклисты (WorkerID == ID пользователя из БД)
    if !requestingUser.IsAdmin && requestData.WorkerID != requestingUser.ID {
        log.Printf("❌ Недостаточно прав: пользователь %d пытается получить чеклисты другого пользователя %d", requestData.TelegramID, requestData.WorkerID)
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Получаем чеклисты пользователя
    checklists, err := h.userService.GetWorkerChecklists(requestData.WorkerID, requestData.Date)
    if err != nil {
        log.Printf("❌ Ошибка получения чеклистов пользователя: %v", err)
        http.Error(w, "Ошибка получения чеклистов пользователя", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":     "success",
        "checklists": checklists,
        "count":      len(checklists),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Список чеклистов пользователя ID=%d на дату %s отправлен, количество: %d", requestData.WorkerID, requestData.Date, len(checklists))
}

// HandleGetCurrentDate - возвращает текущую дату сервера
func (h *HTTPHandlers) HandleGetCurrentDate(w http.ResponseWriter, r *http.Request) {
    // Используем локальное время сервера
    loc := time.Local
    
    // Получаем текущую дату в формате YYYY-MM-DD с учетом часового пояса
    currentDate := time.Now().In(loc).Format("2006-01-02")
    
    response := map[string]interface{}{
        "status": "success",
        "date":   currentDate,
    }
    fmt.Println(currentDate)
    fmt.Println(currentDate)
    fmt.Println(currentDate)
    fmt.Println(currentDate)
    fmt.Println(currentDate)
    fmt.Println(currentDate)
    fmt.Println(currentDate)
    fmt.Println(currentDate)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    
    log.Printf("✅ Текущая дата отправлена: %s", currentDate)
}

// HandleUploadChecklistPhoto - загрузка фото для чеклиста
// func (h *HTTPHandlers) HandleUploadChecklistPhoto(w http.ResponseWriter, r *http.Request) {
// 	// Ограничиваем размер загружаемого файла до 10MB
// 	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	
// 	// Парсим JSON из тела запроса
// 	var requestData struct {
// 		ChecklistID int64  `json:"checklist_id"`
// 		PhotoData   string `json:"photo_data"` // Base64 строка фото или несколько строк, разделенных запятой
// 		WorkerID    int64  `json:"worker_id"`
// 		TelegramID  int64  `json:"telegram_id"`
// 	}
	
// 	decoder := json.NewDecoder(r.Body)
// 	err := decoder.Decode(&requestData)
// 	if err != nil {
// 		log.Printf("❌ Ошибка парсинга JSON: %v", err)
// 	http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
// 		return
// 	}
	
// 	// Проверяем, что пользователь загружает фото для своего чеклиста
// 	requestingUser, err := h.userService.GetUser(requestData.TelegramID, requestData.WorkerID)
// 	if err != nil || requestingUser == nil {
// 		log.Printf("❌ Ошибка получения пользователя: %v", err)
// 		http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
// 		return
// 	}
	
// 	// Получаем информацию о чеклисте
// 	checklist, err := h.userService.GetChecklistByID(requestData.ChecklistID)
// 	if err != nil || checklist == nil {
// 		log.Printf("❌ Ошибка получения чеклиста: %v", err)
// 	http.Error(w, "Чеклист не найден", http.StatusNotFound)
// 	return
// 	}
	
// 	// Проверяем, что чеклист принадлежит пользователю
// 	// Для этого получаем чеклисты пользователя на дату чеклиста
// 	userChecklists, err := h.userService.GetWorkerChecklists(requestingUser.ID, checklist.Date)
// 	if err != nil {
// 	log.Printf("❌ Ошибка получения чеклистов пользователя: %v", err)
// 	http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
// 		return
// 	}
	
// 	// Проверяем, есть ли чеклист в списке чеклистов пользователя
// 	found := false
// 	for _, userChecklist := range userChecklists {
// 		if userChecklist.ID == requestData.ChecklistID {
// 			found = true
// 			break
// 		}
// 	}
	
// 	if !found {
// 		log.Printf("❌ Пользователь %d пытается загрузить фото для чеклиста %d, который ему не принадлежит", requestData.WorkerID, requestData.ChecklistID)
// 	http.Error(w, "Недостаточно прав", http.StatusForbidden)
// 		return
// 	}
	
// 	// Разделяем строку с фото по запятой, если их несколько
// 	photoDataList := strings.Split(requestData.PhotoData, ",")
	
// 	// Создаем директорию для изображений чеклистов, если её нет
// 	imagesDir := "./public/list"
// 	if _, err := os.Stat(imagesDir); os.IsNotExist(err) {
// 		err := os.MkdirAll(imagesDir, 0755)
// 	if err != nil {
// 			log.Printf("❌ Ошибка создания директории: %v", err)
// 			http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
// 			return
// 		}
// 	}
	
// 	// Обрабатываем каждое фото
// 	var photoPaths []string
// 	for i, photoData := range photoDataList {
// 		// Убираем лишние пробелы
// 		photoData = strings.TrimSpace(photoData)
// 		if photoData == "" {
// 			continue
// 		}
		
// 		// Декодируем Base64 строку в бинарные данные
// 	photoBytes, err := base64.StdEncoding.DecodeString(photoData)
// 		if err != nil {
// 			log.Printf("❌ Ошибка декодирования Base64: %v", err)
// 			http.Error(w, "Некорректные данные фото", http.StatusBadRequest)
// 			return
// 		}
		
// 		// Генерируем уникальное имя файла
// 		fileExt := ".jpg" // Предполагаем, что фото в формате JPEG
// 		newFileName := fmt.Sprintf("checklist_%d_%d_%d%s", requestData.ChecklistID, time.Now().Unix(), i, fileExt)
// 		filePath := filepath.Join(imagesDir, newFileName)
		
// 		// Создаем файл на сервере
// 		dst, err := os.Create(filePath)
// 		if err != nil {
// 			log.Printf("❌ Ошибка создания файла: %v", err)
// 			http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
// 			return
// 		}
// 		defer dst.Close()
		
// 		// Записываем бинарные данные фото в файл
// 		if _, err := dst.Write(photoBytes); err != nil {
// 		log.Printf("❌ Ошибка записи файла: %v", err)
// 			http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
// 			return
// 		}
		
// 		// Формируем путь для доступа через веб
// 		webPath := fmt.Sprintf("/list/%s", newFileName)
// 		photoPaths = append(photoPaths, webPath)
// 	}
	
// 	// Объединяем все пути к фото в одну строку с запятой как разделителем
// 	finalPhotoPath := strings.Join(photoPaths, ",")
	
// 	// Обновляем чеклист с путем к фото и устанавливаем статус выполнения
// 	err = h.userService.UpdateChecklist(requestData.ChecklistID, finalPhotoPath)
// 	if err != nil {
// 		log.Printf("❌ Ошибка обновления чеклиста: %v", err)
// 		http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
// 		return
// 	}
	
// 	response := map[string]interface{}{
// 		"status": "success",
// 		"message": fmt.Sprintf("Фото успешно загружены! Всего: %d", len(photoPaths)),
// 		"photo_path": finalPhotoPath,
// 	}
	
// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(response)
// 	log.Printf("✅ Фото успешно загружены для чеклиста ID=%d: %s", requestData.ChecklistID, finalPhotoPath)
// }

// HandleAddChecklistPhoto - добавление нового фото к существующим фото чеклиста
func (h *HTTPHandlers) HandleAddChecklistPhoto(w http.ResponseWriter, r *http.Request) {
    // Ограничиваем размер загружаемого файла до 10MB
    r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
    
    // Парсим JSON из тела запроса
    var requestData struct {
        ChecklistID int64  `json:"checklist_id"`
        PhotoData   string `json:"photo_data"` // Base64 строка фото
        WorkerID    int64  `json:"worker_id"`
        TelegramID  int64  `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }
    
    // Проверяем, что чеклист принадлежит пользователю - ВСЁ В ОДНОМ ЗАПРОСЕ!
    checklist, err := h.userService.GetWorkerChecklistByID(requestData.WorkerID, requestData.ChecklistID)
    if err != nil || checklist == nil {
        log.Printf("❌ Чеклист ID=%d не принадлежит пользователю ID=%d или не существует: %v", 
            requestData.ChecklistID, requestData.WorkerID, err)
        http.Error(w, "Чеклист не найден или недостаточно прав", http.StatusForbidden)
        return
    }
    
    // Проверяем, что есть данные фото
    if requestData.PhotoData == "" {
        log.Printf("❌ Не предоставлены данные фото")
        http.Error(w, "Нет данных фото", http.StatusBadRequest)
        return
    }
    
    // Разделяем строку с фото по запятой, если их несколько
    photoDataList := strings.Split(requestData.PhotoData, ",")
    
    // Создаем директорию для изображений чеклистов, если её нет
    imagesDir := "./public/list"
    if _, err := os.Stat(imagesDir); os.IsNotExist(err) {
        err := os.MkdirAll(imagesDir, 0755)
        if err != nil {
            log.Printf("❌ Ошибка создания директории: %v", err)
            http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
            return
        }
    }
    
    // Обрабатываем каждое фото
    var newPhotoPaths []string
    for i, photoData := range photoDataList {
        // Убираем лишние пробелы
        photoData = strings.TrimSpace(photoData)
        if photoData == "" {
            continue
        }
        
        // Декодируем Base64 строку в бинарные данные
        photoBytes, err := base64.StdEncoding.DecodeString(photoData)
        if err != nil {
            log.Printf("❌ Ошибка декодирования Base64: %v", err)
            http.Error(w, "Некорректные данные фото", http.StatusBadRequest)
            return
        }
        
        // Генерируем уникальное имя файла
        fileExt := ".jpg" // Предполагаем, что фото в формате JPEG
        newFileName := fmt.Sprintf("checklist_add_%d_%d_%d%s", requestData.ChecklistID, time.Now().Unix(), i, fileExt)
        filePath := filepath.Join(imagesDir, newFileName)
        
        // Создаем файл на сервере
        dst, err := os.Create(filePath)
        if err != nil {
            log.Printf("❌ Ошибка создания файла: %v", err)
            http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
            return
        }
        defer dst.Close()
        
        // Записываем бинарные данные фото в файл
        if _, err := dst.Write(photoBytes); err != nil {
            log.Printf("❌ Ошибка записи файла: %v", err)
            http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
            return
        }
        
        // Формируем путь для доступа через веб
        webPath := fmt.Sprintf("/list/%s", newFileName)
        newPhotoPaths = append(newPhotoPaths, webPath)
    }
    
    // Объединяем все новые пути к фото в одну строку
    newPhotosPath := strings.Join(newPhotoPaths, ",")

    // Определяем новые пути к фото
    var finalPhotoPath string
    if checklist.Photo == "" {
        // Если фото еще нет, используем только новое фото
        finalPhotoPath = newPhotosPath
    } else {
        // Если уже есть фото, добавляем новое через запятую
        finalPhotoPath = checklist.Photo + "," + newPhotosPath
    }
    // Обновляем фото в объекте для публикации
    checklist.Photo = finalPhotoPath
    // Добавляем новые фото к существующим
    err = h.userService.AddChecklistPhoto(checklist)
    if err != nil {
        log.Printf("❌ Ошибка добавления фото к чеклисту: %v", err)
        http.Error(w, "Ошибка сервера", http.StatusInternalServerError)
        return
    }
    
    
    response := map[string]interface{}{
        "status": "success",
        "message": fmt.Sprintf("Фото успешно добавлены! Всего новых фото: %d", len(newPhotoPaths)),
        "new_photo_path": newPhotosPath,
        "total_photos": len(strings.Split(checklist.Photo, ",")),
        "checklist": checklist,
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Фото успешно добавлены к чеклисту ID=%d: %s", requestData.ChecklistID, newPhotosPath)
}


// HandleCalculateSalary - расчет заработной платы за месяц
func (h *HTTPHandlers) HandleCalculateSalary(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        WorkerID   int64  `json:"worker_id"`
        Month      string `json:"month"` // формат "YYYY-MM"
        AdminID    int64  `json:"admin_id"`
        TelegramID int64  `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для расчета зарплаты: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    log.Printf("💰 Получен запрос на расчет зарплаты:")
    log.Printf("👤 WorkerID: %d", requestData.WorkerID)
    log.Printf("📅 Месяц: %s", requestData.Month)
    log.Printf("👤 AdminID: %d", requestData.AdminID)
    log.Printf("👤 TelegramID: %d", requestData.TelegramID)

    // Проверяем права доступа: пользователь должен быть админом ИЛИ запрашивать свою зарплату
    requestingUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || requestingUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }

    // Разрешаем доступ если:
    // 1. Пользователь является администратором, ИЛИ
    // 2. Пользователь запрашивает свою зарплату (WorkerID == AdminID)
    if !requestingUser.IsAdmin && requestData.WorkerID != requestData.AdminID {
        log.Printf("❌ Недостаточно прав: пользователь %d не является админом и запрашивает зарплату другого работника %d", requestData.AdminID, requestData.WorkerID)
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Вычисляем зарплату
    salaryData, err := h.userService.CalculateSalary(requestData.WorkerID, requestData.Month)
    if err != nil {
        log.Printf("❌ Ошибка расчета зарплаты: %v", err)
        http.Error(w, "Ошибка расчета зарплаты", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":      "success",
        "salary_data": salaryData,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Расчет зарплаты отправлен для работника ID=%d за месяц %s", requestData.WorkerID, requestData.Month)
}
// HandleGetAllSalaries - получение зарплат всех сотрудников для администратора
func (h *HTTPHandlers) HandleGetAllSalaries(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        Month      string `json:"month"` // формат "YYYY-MM"
        AdminID    int64  `json:"admin_id"`
        TelegramID int64 `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для получения зарплат всех сотрудников: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    log.Printf("💰 Получен запрос на получение зарплат всех сотрудников:")
    log.Printf("📅 Месяц: %s", requestData.Month)
    log.Printf("👤 AdminID: %d", requestData.AdminID)
    log.Printf("👤 TelegramID: %d", requestData.TelegramID)

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    if !adminUser.IsAdmin {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Получаем зарплаты всех сотрудников
    allSalaries, totalAmount, err := h.userService.CalculateAllSalaries(requestData.Month)
    if err != nil {
        log.Printf("❌ Ошибка получения зарплат всех сотрудников: %v", err)
        http.Error(w, "Ошибка получения зарплат всех сотрудников", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":        "success",
        "salaries_data": allSalaries,
        "total_amount":  totalAmount,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Зарплаты всех сотрудников отправлены за месяц %s, общая сумма: %f", requestData.Month, totalAmount)

}

// HandleDeleteSchedule - удаление расписания по ID
func (h *HTTPHandlers) HandleDeleteSchedule(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        ScheduleID   int64 `json:"schedule_id"`
        AdminID      int64 `json:"admin_id"`
        AdminTgId    int64 `json:"telegram_id"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON для удаления расписания: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    log.Printf("🗑️ Получен запрос на удаление расписания:")
    log.Printf("📋 ScheduleID: %d", requestData.ScheduleID)
    log.Printf("👤 AdminID: %d", requestData.AdminID)
    log.Printf("👤 AdminTgId: %d", requestData.AdminTgId)

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.AdminTgId, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя админа")
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    
    if !adminUser.IsAdmin {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    // Получаем информацию о расписании для проверки даты
    schedule, err := h.userService.GetScheduleByID(requestData.ScheduleID)
    if err != nil || schedule == nil {
        log.Printf("❌ Ошибка получения расписания: %v", err)
        http.Error(w, "Расписание не найдено", http.StatusNotFound)
        return
    }

    // Проверяем, что дата расписания не ранее текущей
    currentDate := time.Now().Format("2006-01-02")

// Преобразуем строки в time.Time
// Обработка даты в формате "2025-11-24T00:00:00Z" или "2025-11-24"
if len(schedule.Date) > 10 {
    scheduleTime, err := time.Parse(time.RFC3339, schedule.Date)
    if err != nil {
        log.Printf("❌ Ошибка парсинга даты расписания: %v", err)
        http.Error(w, "Неверный формат даты расписания", http.StatusBadRequest)
        return
    }
    
    // Получаем текущую дату без времени (только дата)
    currentDateOnly := time.Now().Format("2006-01-02")
    currentTime, err := time.Parse("2006-01-02", currentDateOnly)
    if err != nil {
        log.Printf("❌ Ошибка парсинга текущей даты: %v", err)
        http.Error(w, "Внутренняя ошибка сервера", http.StatusInternalServerError)
        return
    }
    
    // Сравниваем только даты (без времени)
    if scheduleTime.Year() < currentTime.Year() ||
        (scheduleTime.Year() == currentTime.Year() && scheduleTime.YearDay() < currentTime.YearDay()) {
            log.Printf("❌ Невозможно удалить расписание с датой %s, которая ранее текущей даты %s",
                schedule.Date, currentDateOnly)
            http.Error(w, "Невозможно удалить расписание с датой, которая ранее текущей", http.StatusBadRequest)
            return
        }
    } else { // Если дата в формате "2025-11-24"
        scheduleTime, err := time.Parse("2006-01-02", schedule.Date)
        if err != nil {
            log.Printf("❌ Ошибка парсинга даты расписания: %v", err)
            http.Error(w, "Неверный формат даты расписания", http.StatusBadRequest)
            return
        }
        
        currentTime, err := time.Parse("2006-01-02", currentDate)
        if err != nil {
            log.Printf("❌ Ошибка парсинга текущей даты: %v", err)
            http.Error(w, "Внутренняя ошибка сервера", http.StatusInternalServerError)
            return
        }
        
        // Сравниваем time.Time
        if scheduleTime.Before(currentTime) {
            log.Printf("❌ Невозможно удалить расписание с датой %s, которая ранее текущей даты %s",
                schedule.Date, currentDate)
            http.Error(w, "Невозможно удалить расписание с датой, которая ранее текущей", http.StatusBadRequest)
            return
        }
    }

    // Удаляем расписание
    err = h.userService.DeleteSchedule(requestData.ScheduleID, schedule.WorkerID, schedule.Date)
    if err != nil {
        log.Printf("❌ Ошибка удаления расписания: %v", err)
        http.Error(w, "Ошибка удаления расписания", http.StatusInternalServerError)
        return
    }
    

    response := map[string]interface{}{
        "status":  "success",
        "message": "Расписание успешно удалено",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    log.Printf("✅ Расписание успешно удалено для ID=%d", requestData.ScheduleID)
}



//__________________________________________________________


// HandleGetAllFineTemplates - получение всех шаблонов штрафов
func (h *HTTPHandlers) HandleGetAllFineTemplates(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        AdminID    int64 `json:"admin_id"`
        TelegramID int64 `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    templates, err := h.userService.GetAllFineTemplates()
    if err != nil {
        log.Printf("❌ Ошибка получения шаблонов штрафов: %v", err)
        http.Error(w, "Ошибка получения шаблонов штрафов", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":   "success",
        "templates": templates,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleGetAllBonusTemplates - получение всех шаблонов премий
func (h *HTTPHandlers) HandleGetAllBonusTemplates(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        AdminID    int64 `json:"admin_id"`
        TelegramID int64 `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    templates, err := h.userService.GetAllBonusTemplates()
    if err != nil {
        log.Printf("❌ Ошибка получения шаблонов премий: %v", err)
        http.Error(w, "Ошибка получения шаблонов премий", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":   "success",
        "templates": templates,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleGetUserBonuses - получение премий пользователя за месяц
func (h *HTTPHandlers) HandleGetUserBonuses(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        UserID     int64  `json:"user_id"`
        Month      string `json:"month"` // формат "YYYY-MM"
        AdminID    int64  `json:"admin_id"`
        TelegramID int64  `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем права доступа: пользователь должен быть админом ИЛИ запрашивать свои собственные премии
    requestingUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || requestingUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }

    // Разрешаем доступ если:
    // 1. Пользователь является администратором, ИЛИ
    // 2. Пользователь запрашивает свои собственные премии (UserID == AdminID)
    if !requestingUser.IsAdmin && requestData.UserID != requestData.AdminID {
        log.Printf("❌ Недостаточно прав: пользователь %d не является админом и запрашивает премии другого работника %d", requestData.AdminID, requestData.UserID)
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    bonuses, err := h.userService.GetUserBonuses(requestData.UserID, requestData.Month)
    if err != nil {
        log.Printf("❌ Ошибка получения премий: %v", err)
        http.Error(w, "Ошибка получения премий", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "bonuses": bonuses,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleGetUserFines - получение штрафов пользователя за месяц
func (h *HTTPHandlers) HandleGetUserFines(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        UserID     int64  `json:"user_id"`
        Month      string `json:"month"` // формат "YYYY-MM"
        AdminID    int64  `json:"admin_id"`
        TelegramID int64  `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем права доступа: пользователь должен быть админом ИЛИ запрашивать свои собственные штрафы
    requestingUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || requestingUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }

    // Разрешаем доступ если:
    // 1. Пользователь является администратором, ИЛИ
    // 2. Пользователь запрашивает свои собственные штрафы (UserID == AdminID)
    if !requestingUser.IsAdmin && requestData.UserID != requestData.AdminID {
        log.Printf("❌ Недостаточно прав: пользователь %d не является админом и запрашивает штрафы другого работника %d", requestData.AdminID, requestData.UserID)
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    fines, err := h.userService.GetUserFines(requestData.UserID, requestData.Month)
    if err != nil {
        log.Printf("❌ Ошибка получения штрафов: %v", err)
        http.Error(w, "Ошибка получения штрафов", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status": "success",
        "fines":  fines,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
// HandleCreateFineTemplate - создание шаблона штрафа
func (h *HTTPHandlers) HandleCreateFineTemplate(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        Template *models.FineTemplate `json:"template"`
        AdminID  int64                `json:"admin_id"`
        TelegramID int64             `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    err = h.userService.CreateFineTemplate(requestData.Template)
    if err != nil {
        log.Printf("❌ Ошибка создания шаблона штрафа: %v", err)
        http.Error(w, "Ошибка создания шаблона штрафа", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Шаблон штрафа успешно создан",
        "template_id": requestData.Template.ID,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleCreateBonusTemplate - создание шаблона премии
func (h *HTTPHandlers) HandleCreateBonusTemplate(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        Template *models.BonusTemplate `json:"template"`
        AdminID  int64                 `json:"admin_id"`
        TelegramID int64              `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    err = h.userService.CreateBonusTemplate(requestData.Template)
    if err != nil {
        log.Printf("❌ Ошибка создания шаблона премии: %v", err)
        http.Error(w, "Ошибка создания шаблона премии", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Шаблон премии успешно создан",
        "template_id": requestData.Template.ID,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleCreateBonus - создание премии
func (h *HTTPHandlers) HandleCreateBonus(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        Bonus      *models.Bonus `json:"bonus"`
        AdminID    int64         `json:"admin_id"`
        TelegramID int64         `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    err = h.userService.CreateBonus(requestData.Bonus)
    if err != nil {
        log.Printf("❌ Ошибка создания премии: %v", err)
        http.Error(w, "Ошибка создания премии", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Премия успешно создана",
        "bonus_id": requestData.Bonus.ID,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleCreateFine - создание штрафа
func (h *HTTPHandlers) HandleCreateFine(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        Fine       *models.Fine `json:"fine"`
        AdminID    int64        `json:"admin_id"`
        TelegramID int64        `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    err = h.userService.CreateFine(requestData.Fine)
    if err != nil {
        log.Printf("❌ Ошибка создания штрафа: %v", err)
        http.Error(w, "Ошибка создания штрафа", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Штраф успешно создан",
        "fine":    requestData.Fine,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleDeleteFineTemplate - удаление шаблона штрафа
func (h *HTTPHandlers) HandleDeleteFineTemplate(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        TemplateID int64 `json:"template_id"`
        AdminID    int64 `json:"admin_id"`
        TelegramID int64 `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    err = h.userService.DeleteFineTemplate(requestData.TemplateID)
    if err != nil {
        log.Printf("❌ Ошибка удаления шаблона штрафа: %v", err)
        http.Error(w, "Ошибка удаления шаблона штрафа", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Шаблон штрафа успешно удален",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleDeleteBonusTemplate - удаление шаблона премии
func (h *HTTPHandlers) HandleDeleteBonusTemplate(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        TemplateID int64 `json:"template_id"`
        AdminID    int64 `json:"admin_id"`
        TelegramID int64 `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    err = h.userService.DeleteBonusTemplate(requestData.TemplateID)
    if err != nil {
        log.Printf("❌ Ошибка удаления шаблона премии: %v", err)
        http.Error(w, "Ошибка удаления шаблона премии", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Шаблон премии успешно удален",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleDeleteBonus - удаление премии
func (h *HTTPHandlers) HandleDeleteBonus(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        BonusID    int64 `json:"bonus_id"`
        AdminID    int64 `json:"admin_id"`
        TelegramID int64 `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    err = h.userService.DeleteBonus(requestData.BonusID)
    if err != nil {
        log.Printf("❌ Ошибка удаления премии: %v", err)
        http.Error(w, "Ошибка удаления премии", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Премия успешно удалена",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HandleDeleteFine - удаление штрафа
func (h *HTTPHandlers) HandleDeleteFine(w http.ResponseWriter, r *http.Request) {
    var requestData struct {
        FineID     int64 `json:"fine_id"`
        AdminID    int64 `json:"admin_id"`
        TelegramID int64 `json:"telegram_id"`
    }

    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&requestData)
    if err != nil {
        log.Printf("❌ Ошибка парсинга JSON: %v", err)
        http.Error(w, "Ошибка парсинга JSON", http.StatusBadRequest)
        return
    }

    // Проверяем, что пользователь является админом
    adminUser, err := h.userService.GetUser(requestData.TelegramID, requestData.AdminID)
    if err != nil || adminUser == nil {
        log.Printf("❌ Ошибка получения пользователя: %v", err)
        http.Error(w, "Ошибка аутентификации", http.StatusUnauthorized)
        return
    }
    if adminUser.IsAdmin == false {
        log.Printf("❌ Пользователь не является администратором")
        http.Error(w, "Недостаточно прав", http.StatusForbidden)
        return
    }

    err = h.userService.DeleteFine(requestData.FineID)
    if err != nil {
        log.Printf("❌ Ошибка удаления штрафа: %v", err)
        http.Error(w, "Ошибка удаления штрафа", http.StatusInternalServerError)
        return
    }

    response := map[string]interface{}{
        "status":  "success",
        "message": "Штраф успешно удален",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

