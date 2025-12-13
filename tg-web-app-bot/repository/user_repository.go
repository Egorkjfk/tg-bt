// repository/user_repository.go
package repository

import (
	"database/sql"
	"fmt"
	"log"
	"tg-web-app-bot/models"
	"tg-web-app-bot/utils"
)

type UserRepository struct {
    db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
    return &UserRepository{db: db}
}

func (r *UserRepository) CreateOrUpdateUser(user *models.User) error {
    query := `
        INSERT INTO users (telegram_id, username, first_name, last_name, phone_number, confirmed, chat_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (telegram_id)
        DO UPDATE SET
            username = EXCLUDED.username,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone_number = COALESCE(EXCLUDED.phone_number, users.phone_number),
            chat_id = EXCLUDED.chat_id
        RETURNING id, created_at
    `
    
    var chatID *int64
    if user.ChatID != nil {
        chatID = user.ChatID
    }
    
    err := r.db.QueryRow(
        query,
        user.TelegramID,
        user.Username,
        user.FirstName,
        user.LastName,
        user.PhoneNumber,
        user.Confirmed,
        chatID,
    ).Scan(&user.ID, &user.CreatedAt)
    
    if err != nil {
        log.Printf("❌ Ошибка создания/обновления пользователя: %v", err)
        return err
    }
    
    log.Printf("✅ Пользователь сохранен в БД: ID=%d, TelegramID=%d", user.ID, user.TelegramID)
    return nil
}

// UpdateUserPhone обновляет только номер телефона
func (r *UserRepository) UpdateUserPhone(userID int64, telegramID int64, phoneNumber string) error {
    query := `UPDATE users SET phone_number = $1 WHERE telegram_id = $2 and id = $3`
    
    result, err := r.db.Exec(query, phoneNumber, telegramID, userID)
    if err != nil {
        log.Printf("❌ Ошибка обновления телефона: %v", err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Телефон обновлен для пользователя %d: phone=%s (затронуто строк: %d)", 
        telegramID, phoneNumber, rowsAffected)
    
    return nil
}


func (r *UserRepository) GetUserByTelegramID(telegramID int64, userID ...int64) (*models.User, error) {
    user := &models.User{}
    
    var query string
    var args []interface{}
    
    if len(userID) > 0 && userID[0] != 0 {
        // Поиск по id AND telegram_id
        query = `
            SELECT id, telegram_id, username, first_name, last_name,
                   phone_number, confirmed, created_at, is_admin, chat_id
            FROM users
            WHERE id = $1 AND telegram_id = $2
        `
        args = []interface{}{userID[0], telegramID}
    } else {
        // Поиск только по telegram_id
        query = `
            SELECT id, telegram_id, username, first_name, last_name,
                   phone_number, confirmed, created_at, is_admin, chat_id
            FROM users
            WHERE telegram_id = $1
        `
        args = []interface{}{telegramID}
    }
    
    var chatID sql.NullInt64
    
    err := r.db.QueryRow(query, args...).Scan(
        &user.ID,
        &user.TelegramID,
        &user.Username,
        &user.FirstName,
        &user.LastName,
        &user.PhoneNumber,
        &user.Confirmed,
        &user.CreatedAt,
        &user.IsAdmin,
        &chatID,
    )
    
    if err == sql.ErrNoRows {
        return nil, nil
    }
    
    if err != nil {
        if len(userID) > 0 {
            log.Printf("❌ Ошибка получения пользователя по ID=%d и TelegramID=%d: %v", userID[0], telegramID, err)
        } else {
            log.Printf("❌ Ошибка получения пользователя по TelegramID=%d: %v", telegramID, err)
        }
        return nil, err
    }
    
    if chatID.Valid {
        user.ChatID = &chatID.Int64
    }
    
    return user, nil
}
func (r *UserRepository) GetUserByID(userID int64) (*models.User, error) {
    user := &models.User{}
    
        query := `
            SELECT id, telegram_id, username, first_name, last_name,
                   phone_number, confirmed, created_at, is_admin, chat_id
            FROM users
            WHERE id = $1
        `
      
    
    var chatID sql.NullInt64
    
    err := r.db.QueryRow(query, userID).Scan(
        &user.ID,
        &user.TelegramID,
        &user.Username,
        &user.FirstName,
        &user.LastName,
        &user.PhoneNumber,
        &user.Confirmed,
        &user.CreatedAt,
        &user.IsAdmin,
        &chatID,
    )
    
    
    if err == sql.ErrNoRows {
        return nil, nil
    }
    
    if err != nil {
       
            log.Printf("❌ Ошибка получения пользователя по ID=%d: %v", userID, err)
        
        return nil, err
    }
    
    if chatID.Valid {
        user.ChatID = &chatID.Int64
    }
    
    return user, nil
}

// DeleteUser - удаление пользователя из базы данных
func (r *UserRepository) DeleteUser(userID int64) error {
    
    // Просто удаляем пользователя - база данных сама удалит связанные записи
    query := `DELETE FROM users WHERE id = $1`
    
    _, err := r.db.Exec(query, userID)
    if err != nil {
        log.Printf("❌ Ошибка удаления пользователя: %v", err)
        return err
    }
    
    return nil
}


func (r *UserRepository) UpdateUserConfirmation(telegramID int64, confirmed bool) error {
    query := `UPDATE users SET confirmed = $1 WHERE telegram_id = $2`
    
    result, err := r.db.Exec(query, confirmed, telegramID)
    if err != nil {
        log.Printf("❌ Ошибка обновления подтверждения: %v", err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Подтверждение обновлено для пользователя %d: confirmed=%t (затронуто строк: %d)",
        telegramID, confirmed, rowsAffected)
    
    return nil
}

// UpdateUserChatID обновляет chat_id пользователя
func (r *UserRepository) UpdateUserChatID(telegramID int64, chatID int64) error {
    query := `UPDATE users SET chat_id = $1 WHERE telegram_id = $2`
    
    result, err := r.db.Exec(query, chatID, telegramID)
    if err != nil {
        log.Printf("❌ Ошибка обновления chat_id: %v", err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Chat_id обновлен для пользователя %d: chat_id=%d (затронуто строк: %d)",
        telegramID, chatID, rowsAffected)
    
    return nil
}

func (r *UserRepository) GetUserAll(users *[] *models.User) error {
    query := `SELECT id, telegram_id, username, first_name, last_name, phone_number, confirmed, created_at, is_admin, chat_id FROM users`

    // Выполняем запрос и получаем строки
    rows, err := r.db.Query(query)
    if err != nil {
        log.Printf("❌ Ошибка выполнения запроса: %v", err)
        return err
    }
    // Важно: закрываем соединение, когда работа со строками завершена
    defer rows.Close()

    // Итерируемся по всем полученным строкам :cite[1]:cite[2]
    for rows.Next() {
        var user models.User // Создаём новую структуру User для каждой строки
        var chatID sql.NullInt64
        // Сканируем данные из колонок строки в поля структуры User :cite[7]
        err := rows.Scan(
            &user.ID,
            &user.TelegramID,
            &user.Username,
            &user.FirstName,
            &user.LastName,
            &user.PhoneNumber,
            &user.Confirmed,
            &user.CreatedAt,
            &user.IsAdmin,
            &chatID,
        )
        if err != nil {
            log.Printf("❌ Ошибка сканирования данных: %v", err)
            return err
        }
        
        if chatID.Valid {
            user.ChatID = &chatID.Int64
        }
        
        // Добавляем указатель на структуру user в итоговый срез
        *users = append(*users, &user)
    }

    // Проверяем, не возникла ли ошибка во время итерации по строкам :cite[1]
    if err := rows.Err(); err != nil {
        log.Printf("❌ Ошибка при работе с рядами: %v", err)
        return err
    }
    log.Printf("✅ Успешно получено пользователей: %d", len(*users))
    return nil
}


func (r *UserRepository) GetAllZones(zones *[]*models.Zone) error {
    query := `SELECT id, name, description, working_hours, image_path, price FROM zones`

    rows, err := r.db.Query(query)
    if err != nil {
        log.Printf("❌ Ошибка выполнения запроса получения зон: %v", err)
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var zone models.Zone
        var price sql.NullFloat64
        var imagePath sql.NullString
        var description sql.NullString
        err := rows.Scan(
            &zone.ID,
            &zone.Name,
            &description,
            &zone.WorkingHours,
            &imagePath,
            &price,
        )
        if err != nil {
            log.Printf("❌ Ошибка сканирования данных зоны: %v", err)
            return err
        }
        if description.Valid {
            zone.Description = &description.String
        } else {
            zone.Description = nil
        }
        // Обработка NULL значений
        if description.Valid {
            zone.Description = &description.String
        } else {
            zone.Description = nil
        }
        if price.Valid {
            zone.Price = &price.Float64
        } else {
            zone.Price = nil
        }
        if imagePath.Valid {
    		zone.ImagePath = imagePath.String
    	} else {
    		zone.ImagePath = ""
    	}

        *zones = append(*zones, &zone)
    }

    if err := rows.Err(); err != nil {
        log.Printf("❌ Ошибка при работе с рядами зон: %v", err)
        return err
    }

    log.Printf("✅ Успешно получено зон: %d", len(*zones))
    return nil
}
// GetZoneByID получает зону по ID
func (r *UserRepository) GetZoneByID(zoneID int64) (*models.Zone, error) {
	query := `
		SELECT id, name, description, working_hours, image_path, price
		FROM zones
		WHERE id = $1
	`
	
	var zone models.Zone
	var description, imagePath sql.NullString
	var price sql.NullFloat64
	
	err := r.db.QueryRow(query, zoneID).Scan(
		&zone.ID,
		&zone.Name,
		&description,
		&zone.WorkingHours,
		&imagePath,
		&price,
	)
	if err != nil {
		log.Printf("❌ Ошибка получения зоны с ID %d: %v", zoneID, err)
		return nil, err
	}
	
	// Обрабатываем NULL значения
	if description.Valid {
		zone.Description = &description.String
	}
	if imagePath.Valid {
		zone.ImagePath = imagePath.String
	}
	if price.Valid {
		zone.Price = &price.Float64
	}
	
	return &zone, nil
}

func (r *UserRepository) UpdateZone(zoneID int64, updates map[string]interface{}) error {
    query := `UPDATE zones SET name = $1, description = $2, working_hours = $3, image_path = $4, price = $5 WHERE id = $6`
    
    // Берем значения из updates или оставляем текущие (NULL) если не переданы
    name := updates["name"]
    description := updates["description"]
    workingHours := updates["working_hours"]
    imagePath := updates["image_path"]
    price := updates["price"]
    
    // Преобразуем description в нужный формат
    var descriptionValue interface{}
    if desc, ok := description.(string); ok && desc != "" {
        descriptionValue = &desc
    } else if description == nil {
        descriptionValue = nil
    } else {
        descriptionValue = description
    }
    
    result, err := r.db.Exec(query, name, descriptionValue, workingHours, imagePath, price, zoneID)
    if err != nil {
        log.Printf("❌ Ошибка обновления зоны ID=%d: %v", zoneID, err)
        return err
    }

    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Зона ID=%d обновлена, затронуто строк: %d", zoneID, rowsAffected)
    return nil
}



// GetChecklists получает чеклисты с фильтрацией по дате и/или зоне
// GetChecklists получает чеклисты с фильтрацией по дате и/или зоне
func (r *UserRepository) GetChecklists(date string, zoneID *int64) ([]*models.Checklist, error) {
    var checklists []*models.Checklist
    var query string
    var args []interface{}

    if zoneID != nil {
        query = `
            SELECT id, date, zone_id, description, photo, status, issue_time, return_time, admin_id, confirmed, important
            FROM checklists
            WHERE date = $1 AND zone_id = $2
            ORDER BY issue_time DESC
        `
        args = []interface{}{date, *zoneID}
    } else {
        query = `
            SELECT id, date, zone_id, description, photo, status, issue_time, return_time, admin_id, confirmed, important
            FROM checklists
            WHERE date = $1
            ORDER BY issue_time DESC
        `
        args = []interface{}{date}
    }

    rows, err := r.db.Query(query, args...)
    if err != nil {
        log.Printf("❌ Ошибка выполнения запроса чеклистов: %v", err)
        return nil, err
    }
    defer rows.Close()

    for rows.Next() {
        var checklist models.Checklist
        var photo sql.NullString
        var returnTime sql.NullTime
        
        err := rows.Scan(
            &checklist.ID,
            &checklist.Date,
            &checklist.ZoneID,
            &checklist.Description,
            &photo,        // Используем sql.NullString для photo
            &checklist.Status,
            &checklist.IssueTime,
            &returnTime,
            &checklist.AdminID,
            &checklist.Confirmed,
            &checklist.Important,
        )
        if err != nil {
            log.Printf("❌ Ошибка сканирования чеклиста: %v", err)
            return nil, err
        }

        // Обрабатываем NULL значения
        if photo.Valid {
            checklist.Photo = photo.String
        } else {
            checklist.Photo = "" // или какое-то значение по умолчанию
        }

        if returnTime.Valid {
            checklist.ReturnTime = &returnTime.Time
        } else {
            checklist.ReturnTime = nil
        }

        checklists = append(checklists, &checklist)
    }

    log.Printf("✅ Успешно получено чеклистов: %d", len(checklists))
    return checklists, nil
 }
   
   // GetWorkerChecklists получает чеклисты пользователя на определенную дату
   func (r *UserRepository) GetWorkerChecklists(workerID int64, date string) ([]*models.Checklist, error) {
    var checklists []*models.Checklist
    
    // Запрос для получения чеклистов пользователя на определенную дату
    // Мы должны найти расписания пользователя на эту дату и соответствующие чеклисты
    query := `
    	SELECT c.id, c.date, c.zone_id, c.description, c.photo, c.status, c.issue_time, c.return_time, c.admin_id, c.confirmed, c.important
    	FROM checklists c
    	INNER JOIN schedules s ON c.zone_id = s.zone_id AND s.date::text = $2
    	WHERE s.worker_id = $1 AND c.date = $2
    	ORDER BY c.issue_time DESC
    `
    
    rows, err := r.db.Query(query, workerID, date)
    if err != nil {
    	log.Printf("❌ Ошибка выполнения запроса чеклистов пользователя: %v", err)
    	return nil, err
    }
    defer rows.Close()
    
    for rows.Next() {
    	var checklist models.Checklist
    	var photo sql.NullString
    	var returnTime sql.NullTime
    	
    	err := rows.Scan(
    		&checklist.ID,
    		&checklist.Date,
    		&checklist.ZoneID,
    		&checklist.Description,
    		&photo,
    		&checklist.Status,
    		&checklist.IssueTime,
    		&returnTime,
    		&checklist.AdminID,
    		&checklist.Confirmed,
    		&checklist.Important,
    	)
    	if err != nil {
    		log.Printf("❌ Ошибка сканирования чеклиста пользователя: %v", err)
    		return nil, err
    	}
    	
    	// Обрабатываем NULL значения
    	if photo.Valid {
    		checklist.Photo = photo.String
    	} else {
    		checklist.Photo = ""
    	}
    	
    	if returnTime.Valid {
    		checklist.ReturnTime = &returnTime.Time
    	} else {
    		checklist.ReturnTime = nil
    	}
    	
    	checklists = append(checklists, &checklist)
    }
    
    if err := rows.Err(); err != nil {
    	log.Printf("❌ Ошибка при работе с рядами чеклистов пользователя: %v", err)
    	return nil, err
    }
    
    log.Printf("✅ Успешно получено чеклистов пользователя ID=%d на дату %s: %d", workerID, date, len(checklists))
    return checklists, nil
   }
// GetWorkerChecklistByID проверяет, принадлежит ли чеклист пользователю и возвращает его
func (r *UserRepository) GetWorkerChecklistByID(workerID int64, checklistID int64) (*models.Checklist, error) {
    var checklist models.Checklist
    var photo sql.NullString // Используем NullString для обработки NULL
    
    query := `
        SELECT c.id, c.zone_id, c.description, c.date, c.issue_time, c.status, c.photo, c.confirmed
        FROM checklists c
        WHERE c.id = $1 AND EXISTS (
            SELECT 1 
            FROM schedules s 
            WHERE s.worker_id = $2 
            AND s.date = c.date::date  -- Приводим строку к типу date
            AND s.zone_id = c.zone_id
        )
    `
    
    err := r.db.QueryRow(query, checklistID, workerID).Scan(
        &checklist.ID,
        &checklist.ZoneID,
        &checklist.Description,
        &checklist.Date,
        &checklist.IssueTime,
        &checklist.Status,
        &photo, // Сканируем в NullString
        &checklist.Confirmed,
    )
    
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, fmt.Errorf("чеклист не найден или не принадлежит пользователю")
        }
        log.Printf("❌ Ошибка получения чеклиста ID=%d для пользователя ID=%d: %v", checklistID, workerID, err)
        return nil, err
    }
    
    // Конвертируем NullString в string
    if photo.Valid {
        checklist.Photo = photo.String
    } else {
        checklist.Photo = ""
    }
    
    return &checklist, nil
}

// GetChecklistByID получает чеклист по ID
func (r *UserRepository) GetChecklistByID(checklistID int64) (*models.Checklist, error) {
    query := `
        SELECT id, date, zone_id, description, photo, status, issue_time, return_time, admin_id, confirmed, important
        FROM checklists
        WHERE id = $1
    `
    
    var checklist models.Checklist
    var photo sql.NullString
    var returnTime sql.NullTime
    
    err := r.db.QueryRow(query, checklistID).Scan(
        &checklist.ID,
        &checklist.Date,
        &checklist.ZoneID,
        &checklist.Description,
        &photo,        // Используем sql.NullString для photo
        &checklist.Status,
        &checklist.IssueTime,
        &returnTime,
        &checklist.AdminID,
        &checklist.Confirmed,
        &checklist.Important,
    )
    
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, nil
        }
        log.Printf("❌ Ошибка получения чеклиста по ID=%d: %v", checklistID, err)
        return nil, err
    }

    // Обрабатываем NULL значения
    if photo.Valid {
        checklist.Photo = photo.String
    } else {
        checklist.Photo = "" // или какое-то значение по умолчанию
    }

    if returnTime.Valid {
        checklist.ReturnTime = &returnTime.Time
    } else {
        checklist.ReturnTime = nil
    }

    log.Printf("✅ Успешно получен чеклист ID=%d", checklistID)
    return &checklist, nil
}

// // UpdateChecklist обновляет чеклист (фото, статус и время возврата)
// func (r *UserRepository) UpdateChecklist(checklistID int64, photo string) error {
//     var photoValue interface{}
//     if photo == "" {
//         photoValue = nil // Устанавливаем NULL если фото пустое
//     } else {
//         photoValue = photo
//     }
    
//     query := `
//         UPDATE checklists 
//         SET photo = $1, status = true, return_time = CURRENT_TIMESTAMP 
//         WHERE id = $2
//     `
    
//     result, err := r.db.Exec(query, photoValue, checklistID)
//     if err != nil {
//         log.Printf("❌ Ошибка обновления чеклиста ID=%d: %v", checklistID, err)
//         return err
//     }

//     rowsAffected, _ := result.RowsAffected()
//     log.Printf("✅ Чеклист ID=%d обновлен, затронуто строк: %d", checklistID, rowsAffected)
//     return nil
// }

// UpdateChecklistPhotoOnly обновляет только фото чеклиста (без изменения статуса)
func (r *UserRepository) UpdateChecklistPhotoOnly(checklistID int64, photo string) error {
    var photoValue interface{}
    if photo == "" {
        photoValue = nil
    } else {
        photoValue = photo
    }
    
    query := `UPDATE checklists SET photo = $1, status = true, return_time = CURRENT_TIMESTAMP WHERE id = $2`
    
    result, err := r.db.Exec(query, photoValue, checklistID)
    if err != nil {
        log.Printf("❌ Ошибка обновления фото чеклиста ID=%d: %v", checklistID, err)
        return err
    }

    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Фото чеклиста ID=%d обновлено, затронуто строк: %d", checklistID, rowsAffected)
    return nil
}

// UpdateUserConfirmed обновляет статус подтверждения пользователя
func (r *UserRepository) UpdateUserConfirmed(userID int64, confirmed bool) error {
    query := `
        UPDATE users
        SET confirmed = $1
        WHERE id = $2
    `
    
    result, err := r.db.Exec(query, confirmed, userID)
    if err != nil {
        log.Printf("❌ Ошибка обновления подтверждения пользователя ID=%d: %v", userID, err)
        return err
    }

    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Подтверждение пользователя ID=%d обновлено, затронуто строк: %d", userID, rowsAffected)
    return nil
}

// UpdateChecklistConfirmed обновляет статус подтверждения чеклиста
func (r *UserRepository) UpdateChecklistConfirmed(checklistID int64, confirmed bool) error {
    query := `
        UPDATE checklists
        SET confirmed = $1
        WHERE id = $2
    `
    
    result, err := r.db.Exec(query, confirmed, checklistID)
    if err != nil {
        log.Printf("❌ Ошибка обновления подтверждения чеклиста ID=%d: %v", checklistID, err)
        return err
    }

    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Подтверждение чеклиста ID=%d обновлено, затронуто строк: %d", checklistID, rowsAffected)
    return nil
}

func (r *UserRepository) UpdateChecklistStatus(checklistID int64, status bool) error {
    query := `
        UPDATE checklists
        SET status = $1, return_time = CURRENT_TIMESTAMP
        WHERE id = $2
    `
    
    result, err := r.db.Exec(query, status, checklistID)
    if err != nil {
        log.Printf("❌ Ошибка обновления статуса чеклиста ID=%d: %v", checklistID, err)
        return err
    }

    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Статус чеклиста ID=%d обновлен, затронуто строк: %d", checklistID, rowsAffected)
    return nil
}

// CreateZone создает новую зону
func (r *UserRepository) CreateZone(zone *models.Zone) error {
    query := `
        INSERT INTO zones (name, description, working_hours, image_path, price)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    `
    
    var descriptionValue *string
    if zone.Description != nil {
        descriptionValue = zone.Description
    } else {
        descriptionValue = nil
    }
    
    err := r.db.QueryRow(
        query,
        zone.Name,
        descriptionValue,
        zone.WorkingHours,
        zone.ImagePath,
        zone.Price,
    ).Scan(&zone.ID)
    
    if err != nil {
        log.Printf("❌ Ошибка создания зоны: %v", err)
        return err
    }

    log.Printf("✅ Зона создана: ID=%d, Name=%s", zone.ID, zone.Name)
    return nil
}

// CreateZone создает новую зону
func (r *UserRepository) DropZone(zoneId int64) error {
    query := `
        DELETE FROM zones WHERE id = $1
    ` 
    _, err := r.db.Exec(query, zoneId)
    if err != nil {
        log.Printf("❌ Ошибка удаления чек зоны ID=%d: %v", zoneId, err)
        return err
    }
    return nil
}

// CreateChecklist создает новый чеклист
func (r *UserRepository) CreateChecklist(checklist *models.Checklist) error {
    query := `
        INSERT INTO checklists (zone_id, description, admin_id, important)
        VALUES ($1, $2, $3, $4)
        RETURNING id, date, issue_time, status, confirmed
    `
    
    err := r.db.QueryRow(
        query,
        checklist.ZoneID,
        checklist.Description,
        checklist.AdminID,
        checklist.Important,
    ).Scan(
        &checklist.ID,
        &checklist.Date,
        &checklist.IssueTime,
        &checklist.Status,
        &checklist.Confirmed,
    )
    
    if err != nil {
        log.Printf("❌ Ошибка создания чеклиста: %v", err)
        return err
    }

    log.Printf("✅ Чеклист создан: ID=%d, ZoneID=%d, AdminID=%d, Date=%s",
        checklist.ID, checklist.ZoneID, checklist.AdminID, checklist.Date)
    return nil
}

// UpdateChecklistDescription обновляет описание чеклиста
func (r *UserRepository) UpdateChecklistDescription(checklistID int64, description string) error {
    query := `UPDATE checklists SET description = $1 WHERE id = $2`
    
    result, err := r.db.Exec(query, description, checklistID)
    if err != nil {
        log.Printf("❌ Ошибка обновления описания чеклиста ID=%d: %v", checklistID, err)
        return err
    }

    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Описание чеклиста ID=%d обновлено, затронуто строк: %d", checklistID, rowsAffected)
    return nil
}

// DeleteChecklist удаляет чеклист по ID
func (r *UserRepository) DeleteChecklist(checklistID int64) error {
    query := `DELETE FROM checklists WHERE id = $1`
    
    result, err := r.db.Exec(query, checklistID)
    if err != nil {
        log.Printf("❌ Ошибка удаления чеклиста ID=%d: %v", checklistID, err)
        return err
    }

    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Чеклист ID=%d удален, затронуто строк: %d", checklistID, rowsAffected)
    return nil
}


// CreateAutoChecklist создает новый чеклист
func (r *UserRepository) CreateAutoChecklist(auto *models.Auto_cheklst) error {
    query := `
        INSERT INTO auto_cheklst (zone_id, description, important)
        VALUES ($1, $2, $3)
        RETURNING id
    `
    
    err := r.db.QueryRow(
        query,
        auto.ZoneID,
        auto.Description,
        auto.Important,
    ).Scan(
        &auto.ID,
    )
    
    if err != nil {
        log.Printf("❌ Ошибка создания авто-чеклиста в БД: %v", err)
        return err
    }

    log.Printf("✅ Чеклист создан: ID=%d, ZoneID=%d",
        auto.ID, auto.ZoneID)
    return nil
}
func (r *UserRepository) DeletAutoChecklist(autoId int64) error {
     query := `
        DELETE FROM auto_cheklst WHERE id = $1
    ` 
    _, err := r.db.Exec(query, autoId)
    if err != nil {
        log.Printf("❌ Ошибка удаления чек зоны ID=%d: %v", autoId, err)
        return err
    }
    return nil
}
func (r *UserRepository) GetAutoChecklists(zoneID int64) ([]*models.Auto_cheklst, error) {
    var checklists []*models.Auto_cheklst
    
        query := `
            SELECT id, zone_id, description, important
            FROM auto_cheklst
            WHERE zone_id = $1
        `


    rows, err := r.db.Query(query, zoneID)
    if err != nil {
        log.Printf("❌ Ошибка выполнения запроса авточеклистов: %v", err)
        return nil, err
    }
    defer rows.Close()

    for rows.Next() {
        var checklist models.Auto_cheklst
        
        err := rows.Scan(
            &checklist.ID,
            &checklist.ZoneID,
            &checklist.Description,
            &checklist.Important,
        )
        if err != nil {
            log.Printf("❌ Ошибка сканирования чеклиста: %v", err)
            return nil, err
        }

        checklists = append(checklists, &checklist)
    }

    log.Printf("✅ Успешно получено авточеклистов: %d", len(checklists))
    return checklists, nil
}

// UpdateAutoChecklist обновляет авто-чеклист
func (r *UserRepository) UpdateAutoChecklist(autoChecklistID int64, description string, important bool) error {
    query := `UPDATE auto_cheklst SET description = $1, important = $2 WHERE id = $3`
    
    result, err := r.db.Exec(query, description, important, autoChecklistID)
    if err != nil {
        log.Printf("❌ Ошибка обновления авто-чеклиста ID=%d: %v", autoChecklistID, err)
        return err
    }

    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Авто-чеклист ID=%d обновлен, затронуто строк: %d", autoChecklistID, rowsAffected)
    return nil
}











// CreateSchedule создает новое расписание
func (r *UserRepository) CreateSchedule(schedule *models.Schedule) error {
    query := `
        INSERT INTO schedules (worker_id, zone_id, date, planned_start_time, planned_end_time)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    `
    
    err := r.db.QueryRow(
        query,
        schedule.WorkerID,
        schedule.ZoneID,
        schedule.Date,
        schedule.PlannedStartTime,
        schedule.PlannedEndTime,
    ).Scan(&schedule.ID)
    
    return err
}

// UpdateActualStartTime обновляет время фактического начала
func (r *UserRepository) UpdateActualStartTime(scheduleID int64, time string) error {
    query := `UPDATE schedules SET actual_start_time = $1 WHERE id = $2`
    
    result, err := r.db.Exec(query, time, scheduleID)
    if err != nil {
        log.Printf("❌ Ошибка обновления времени начала: %v", err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Время начала обновлено для расписания %d (затронуто строк: %d)", scheduleID, rowsAffected)
    return nil
}

// UpdateActualEndTime обновляет время фактического окончания
func (r *UserRepository) UpdateActualEndTime(scheduleID int64, time string) error {
    query := `UPDATE schedules SET actual_end_time = $1 WHERE id = $2`
    
    result, err := r.db.Exec(query, time, scheduleID)
    if err != nil {
        log.Printf("❌ Ошибка обновления времени окончания: %v", err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Время окончания обновлено для расписания %d (затронуто строк: %d)", scheduleID, rowsAffected)
    return nil
}

// UpdatePhotoStart обновляет фото начала смены
func (r *UserRepository) UpdatePhotoStart(scheduleID int64, photoPath string) error {
    query := `UPDATE schedules SET photo_start = $1 WHERE id = $2`
    
    result, err := r.db.Exec(query, photoPath, scheduleID)
    if err != nil {
        log.Printf("❌ Ошибка обновления фото начала смены: %v", err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Фото начала смены обновлено для расписания %d (затронуто строк: %d)", scheduleID, rowsAffected)
    return nil
}

// UpdatePhotoEnd обновляет фото окончания смены
func (r *UserRepository) UpdatePhotoEnd(scheduleID int64, photoPath string) error {
    query := `UPDATE schedules SET photo_end = $1 WHERE id = $2`
    
    result, err := r.db.Exec(query, photoPath, scheduleID)
    if err != nil {
        log.Printf("❌ Ошибка обновления фото окончания смены: %v", err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Фото окончания смены обновлено для расписания %d (затронуто строк: %d)", scheduleID, rowsAffected)
    return nil
}

// GetWorkerWeeklySchedule получает расписание на неделю для работника
func (r *UserRepository) GetWorkerWeeklySchedule(workerID int64, weekOffset int) ([]*models.Schedule, error) {
    // Вычисляем даты начала и конца недели
    startDate, endDate := utils.GetWeekRange(weekOffset)
    
    query := `
        SELECT 
            id, worker_id, zone_id, hourly_rate, date, 
            planned_start_time, planned_end_time, 
            actual_start_time, actual_end_time, 
            photo_start, photo_end, hourly_rate
        FROM schedules
        WHERE worker_id = $1 AND date BETWEEN $2::date AND $3::date
        ORDER BY date, planned_start_time
    `
    
    rows, err := r.db.Query(query, workerID, startDate, endDate)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var schedules []*models.Schedule
    for rows.Next() {
        var schedule models.Schedule
        var photoStart, photoEnd sql.NullString
        
        err := rows.Scan(
            &schedule.ID,
            &schedule.WorkerID,
            &schedule.ZoneID,
            &schedule.HourlyRate,
            &schedule.Date,
            &schedule.PlannedStartTime,
            &schedule.PlannedEndTime,
            &schedule.ActualStartTime,
            &schedule.ActualEndTime,
            &photoStart,
            &photoEnd,
            &schedule.Price,
        )
        if err != nil {
            return nil, err
        }
        
        // Конвертируем sql.NullString в *string
        if photoStart.Valid {
            schedule.PhotoStart = &photoStart.String
        }
        if photoEnd.Valid {
            schedule.PhotoEnd = &photoEnd.String
        }
        
        schedules = append(schedules, &schedule)
    }
    
    return schedules, nil
}

// GetScheduleByID получает расписание по ID
func (r *UserRepository) GetScheduleByID(scheduleID int64) (*models.Schedule, error) {
    query := `
        SELECT id, worker_id, zone_id, date, planned_start_time, planned_end_time, actual_start_time, actual_end_time
        FROM schedules
        WHERE id = $1
    `
    
    var schedule models.Schedule
    err := r.db.QueryRow(query, scheduleID).Scan(
        &schedule.ID,
        &schedule.WorkerID,
        &schedule.ZoneID,
        &schedule.Date,
        &schedule.PlannedStartTime,
        &schedule.PlannedEndTime,
        &schedule.ActualStartTime,
        &schedule.ActualEndTime,
    )
    
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, nil
        }
        return nil, err
    }
    
    return &schedule, nil
}

// GetAllWorkersWeeklySchedule получает расписание всех работников на неделю
func (r *UserRepository) GetAllWorkersWeeklySchedule(weekOffset int) ([]*models.Schedule, error) {
    // Вычисляем даты начала и конца недели
    startDate, endDate := utils.GetWeekRange(weekOffset)
    
    query := `
        SELECT id, worker_id, zone_id, date, planned_start_time, planned_end_time, actual_start_time, actual_end_time
        FROM schedules
        WHERE date BETWEEN $1::date AND $2::date
        ORDER BY worker_id, date, planned_start_time
    `
    
    rows, err := r.db.Query(query, startDate, endDate)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var schedules []*models.Schedule
    for rows.Next() {
        var schedule models.Schedule
        err := rows.Scan(
            &schedule.ID,
            &schedule.WorkerID,
            &schedule.ZoneID,
            &schedule.Date,
            &schedule.PlannedStartTime,
            &schedule.PlannedEndTime,
            &schedule.ActualStartTime,
            &schedule.ActualEndTime,
        )
        if err != nil {
            return nil, err
        }
        schedules = append(schedules, &schedule)
    }
    
    return schedules, nil
}

// GetSchedulesForDate получает все расписания на указанную дату
func (r *UserRepository) GetSchedulesForDate(date string) ([]*models.Schedule, error) {
	query := `
		SELECT id, worker_id, zone_id, date, planned_start_time, planned_end_time, 
		       actual_start_time, actual_end_time, hourly_rate, photo_start, photo_end
		FROM schedules
		WHERE date = $1
		ORDER BY worker_id, planned_start_time
	`
	
	rows, err := r.db.Query(query, date)
	if err != nil {
		log.Printf("❌ Ошибка выполнения запроса расписаний на дату %s: %v", date, err)
		return nil, err
	}
	defer rows.Close()
	
	var schedules []*models.Schedule
	for rows.Next() {
		var schedule models.Schedule
		var actualStartTime, actualEndTime, photoStart, photoEnd sql.NullString
		var zoneID sql.NullInt64
		
		err := rows.Scan(
			&schedule.ID,
			&schedule.WorkerID,
			&zoneID,
			&schedule.Date,
			&schedule.PlannedStartTime,
			&schedule.PlannedEndTime,
			&actualStartTime,
			&actualEndTime,
			&schedule.HourlyRate,
			&photoStart,
			&photoEnd,
		)
		if err != nil {
			log.Printf("❌ Ошибка сканирования расписания: %v", err)
			return nil, err
		}
		
		// Обрабатываем NULL значения
		if zoneID.Valid {
			schedule.ZoneID = &zoneID.Int64
		}
		if actualStartTime.Valid {
			schedule.ActualStartTime = &actualStartTime.String
		}
		if actualEndTime.Valid {
			schedule.ActualEndTime = &actualEndTime.String
		}
		if photoStart.Valid {
			schedule.PhotoStart = &photoStart.String
		}
		if photoEnd.Valid {
			schedule.PhotoEnd = &photoEnd.String
		}
		
		schedules = append(schedules, &schedule)
	}
	
	if err := rows.Err(); err != nil {
		log.Printf("❌ Ошибка при работе с результатами запроса расписаний: %v", err)
		return nil, err
	}
	
	log.Printf("✅ Успешно получено расписаний на дату %s: %d", date, len(schedules))
	return schedules, nil
}

// GetWorkerByZoneID возвращает работника, назначенного на указанную зону в определенную дату
func (r *UserRepository) GetWorkerByZoneID(zoneID int64, date string) ([]*models.User, error) {
    query := `
        SELECT u.id, u.telegram_id, u.username, u.first_name, u.last_name,
               u.phone_number, u.confirmed, u.created_at, u.is_admin, u.chat_id
        FROM users u
        INNER JOIN schedules s ON u.id = s.worker_id
        WHERE s.zone_id = $1 AND s.date = $2
    `
    
    rows, err := r.db.Query(query, zoneID, date)
    if err != nil {
        log.Printf("❌ Ошибка выполнения запроса работников для зоны %d: %v", zoneID, err)
        return nil, err
    }
    defer rows.Close()
    
    var users []*models.User
    for rows.Next() {
        var user models.User
        var chatID sql.NullInt64
        
        err := rows.Scan(
            &user.ID,
            &user.TelegramID,
            &user.Username,
            &user.FirstName,
            &user.LastName,
            &user.PhoneNumber,
            &user.Confirmed,
            &user.CreatedAt,
            &user.IsAdmin,
            &chatID,
        )
        
        if err != nil {
            log.Printf("❌ Ошибка сканирования данных работника: %v", err)
            return nil, err
        }
        
        if chatID.Valid {
            user.ChatID = &chatID.Int64
        }
        
        users = append(users, &user)
    }
    
    if err = rows.Err(); err != nil {
        log.Printf("❌ Ошибка при итерации по результатам запроса: %v", err)
        return nil, err
    }
    
    if len(users) == 0 {
        log.Printf("⚠️ Работники не найдены для зоны %d на дату %s", zoneID, date)
        return nil, nil
    }
    
    log.Printf("✅ Найдено %d работников для зоны %d на дату %s", len(users), zoneID, date)
    return users, nil
}



// GetWorkerMonthlySchedule получает расписание работника за указанный месяц
func (r *UserRepository) GetWorkerMonthlySchedule(workerID int64, month string) ([]*models.Schedule, error) {
    query := `
        SELECT id, worker_id, zone_id, hourly_rate, date, 
               planned_start_time, planned_end_time, 
               actual_start_time, actual_end_time
        FROM schedules 
        WHERE worker_id = $1 AND to_char(date, 'YYYY-MM') = $2
        ORDER BY date
    `
    
    rows, err := r.db.Query(query, workerID, month)
    if err != nil {
        log.Printf("❌ Ошибка выполнения запроса расписания за месяц: %v", err)
        return nil, err
    }
    defer rows.Close()
    
    var schedules []*models.Schedule
    for rows.Next() {
        var schedule models.Schedule
        var actualStartTime, actualEndTime sql.NullString
        
        err := rows.Scan(
            &schedule.ID,
            &schedule.WorkerID,
            &schedule.ZoneID,
            &schedule.HourlyRate,
            &schedule.Date,
            &schedule.PlannedStartTime,
            &schedule.PlannedEndTime,
            &actualStartTime,
            &actualEndTime,
        )
        if err != nil {
            log.Printf("❌ Ошибка сканирования расписания: %v", err)
            return nil, err
        }
        
        // Обрабатываем NULL значения
        if actualStartTime.Valid {
            schedule.ActualStartTime = &actualStartTime.String
        }
        if actualEndTime.Valid {
            schedule.ActualEndTime = &actualEndTime.String
        }
        
        schedules = append(schedules, &schedule)
    }
    
    if err := rows.Err(); err != nil {
        log.Printf("❌ Ошибка при работе с рядами расписания: %v", err)
        return nil, err
    }
    
    log.Printf("✅ Успешно получено расписаний для работника %d за месяц %s: %d", workerID, month, len(schedules))
    return schedules, nil
}

// DeleteOldChecklists удаляет старые чек-листы с important=false и датой старше недели
func (r *UserRepository) DeleteOldChecklists() ([]string, error) {
    query := `
        SELECT id, photo
        FROM checklists
        WHERE important = false
        AND date < (CURRENT_DATE - INTERVAL '7 days')::text 
    `
    
    rows, err := r.db.Query(query)
    if err != nil {
        log.Printf("❌ Ошибка выполнения запроса получения старых чек-листов: %v", err)
        return nil, err
    }
    defer rows.Close()
    
    var checklistIDs []int64
    var photoPaths []string
    
    for rows.Next() {
        var id int64
        var photo sql.NullString
        
        err := rows.Scan(&id, &photo)
        if err != nil {
            log.Printf("❌ Ошибка сканирования старого чек-листа: %v", err)
            continue
        }
        
        checklistIDs = append(checklistIDs, id)
        
        if photo.Valid && photo.String != "" {
            photoPaths = append(photoPaths, photo.String)
        }
    }
    
    if err := rows.Err(); err != nil {
        log.Printf("❌ Ошибка при работе с результатами запроса: %v", err)
        return nil, err
    }
    
    if len(checklistIDs) > 0 {
        // Удаляем чек-листы по ID
        // Используем транзакцию для безопасного удаления
        tx, err := r.db.Begin()
        if err != nil {
            log.Printf("❌ Ошибка начала транзакции: %v", err)
            return nil, err
        }
        defer tx.Rollback() // Откатываем транзакцию в случае ошибки
        
        // Удаляем чек-листы по одному или небольшими пакетами
        for _, id := range checklistIDs {
            _, err := tx.Exec("DELETE FROM checklists WHERE id = $1", id)
            if err != nil {
                log.Printf("❌ Ошибка удаления чек-листа с ID %d: %v", id, err)
                return nil, err
            }
        }
        
        // Фиксируем транзакцию
        err = tx.Commit()
        if err != nil {
            log.Printf("❌ Ошибка фиксации транзакции: %v", err)
            return nil, err
        }
        
        log.Printf("✅ Успешно удалено %d старых чек-листов", len(checklistIDs))
    } else {
        log.Printf("ℹ️ Нет старых чек-листов для удаления")
    }
    
    return photoPaths, nil
}

// ExecuteHourlyChecklistsCopy выполняет копирование автосписков каждый час
func (r *UserRepository) ExecuteHourlyChecklistsCopy() error {
    // Логируем текущее время
    var currentTime string
    err := r.db.QueryRow("SELECT NOW()::text").Scan(&currentTime)
    if err != nil {
        log.Printf("⚠️ Не удалось получить время БД: %v", err)
    } else {
        log.Printf("🕒 Текущее время в БД: %s", currentTime)
    }
    
    query := `SELECT * FROM copy_auto_checklists_hourly();`
    
    rows, err := r.db.Query(query)
    if err != nil {
        log.Printf("❌ Ошибка выполнения copy_auto_checklists_hourly(): %v", err)
        return err
    }
    defer rows.Close()
    
    var zoneID int64
    var action string
    count := 0
    
    for rows.Next() {
        if err := rows.Scan(&zoneID, &action); err != nil {
            log.Printf("❌ Ошибка сканирования результата: %v", err)
            continue
        }
        log.Printf("✅ Скопированы чеклисты для зоны %d", zoneID)
        count++
    }
    
    if err = rows.Err(); err != nil {
        log.Printf("❌ Ошибка при обработке результатов: %v", err)
        return err
    }
    
    if count == 0 {
        log.Printf("ℹ️ Не найдено зон для копирования чеклистов")
    } else {
        log.Printf("✅ Всего скопировано чеклистов для %d зон", count)
    }
    
    return nil
}

// DeleteSchedule удаляет расписание по ID
func (r *UserRepository) DeleteSchedule(scheduleID int64) error {
    query := `DELETE FROM schedules WHERE id = $1`
    
    result, err := r.db.Exec(query, scheduleID)
    if err != nil {
        log.Printf("❌ Ошибка удаления расписания: %v", err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Удалено расписаний: %d (ID: %d)", rowsAffected, scheduleID)
    
    return nil
}

// AutoCompleteEndedShifts автоматически завершает смены, у которых истекло время
func (r *UserRepository) AutoCompleteEndedShifts() error {
    query := `
        UPDATE schedules 
        SET actual_end_time = planned_end_time
        WHERE date = CURRENT_DATE
          AND actual_start_time IS NOT NULL 
          AND actual_end_time IS NULL
          AND CURRENT_TIME > planned_end_time`
    
    result, err := r.db.Exec(query)
    if err != nil {
        log.Printf("❌ Ошибка автоматического завершения смен: %v", err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    log.Printf("✅ Автоматически завершено смен: %d", rowsAffected)
    
    return nil
}

//_________________________________________________________________________//


// GetAllFineTemplates получает все шаблоны штрафов
func (r *UserRepository) GetAllFineTemplates() ([]*models.FineTemplate, error) {
    query := `
        SELECT id, name, price
        FROM fine_templates
        ORDER BY name
    `
    
    rows, err := r.db.Query(query)
    if err != nil {
        log.Printf("❌ Ошибка выполнения запроса получения шаблонов штрафов: %v", err)
        return nil, err
    }
    defer rows.Close()
    
    var templates []*models.FineTemplate
    for rows.Next() {
        var template models.FineTemplate
        err := rows.Scan(
            &template.ID,
            &template.Name,
            &template.Price,
        )
        if err != nil {
            log.Printf("❌ Ошибка сканирования шаблона штрафа: %v", err)
            return nil, err
        }
        templates = append(templates, &template)
    }
    
    if err := rows.Err(); err != nil {
        log.Printf("❌ Ошибка при работе с результатами запроса шаблонов штрафов: %v", err)
        return nil, err
    }
    
    log.Printf("✅ Успешно получено шаблонов штрафов: %d", len(templates))
    return templates, nil
}

// GetAllBonusTemplates получает все шаблоны премий
func (r *UserRepository) GetAllBonusTemplates() ([]*models.BonusTemplate, error) {
    query := `
        SELECT id, name, price
        FROM bonus_templates
        ORDER BY name
    `
    
    rows, err := r.db.Query(query)
    if err != nil {
        log.Printf("❌ Ошибка выполнения запроса получения шаблонов премий: %v", err)
        return nil, err
    }
    defer rows.Close()
    
    var templates []*models.BonusTemplate
    for rows.Next() {
        var template models.BonusTemplate
        err := rows.Scan(
            &template.ID,
            &template.Name,
            &template.Price,
        )
        if err != nil {
            log.Printf("❌ Ошибка сканирования шаблона премии: %v", err)
            return nil, err
        }
        templates = append(templates, &template)
    }
    
    if err := rows.Err(); err != nil {
        log.Printf("❌ Ошибка при работе с результатами запроса шаблонов премий: %v", err)
        return nil, err
    }
    
    log.Printf("✅ Успешно получено шаблонов премий: %d", len(templates))
    return templates, nil
}

// GetUserFines получает все штрафы для пользователя за указанный месяц
func (r *UserRepository) GetUserFines(userID int64, month string) ([]*models.Fine, error) {
    query := `
        SELECT id, name, price, user_id, created_at
        FROM fines
        WHERE user_id = $1 AND to_char(created_at, 'YYYY-MM') = $2
        ORDER BY created_at DESC
    `
    
    rows, err := r.db.Query(query, userID, month)
    if err != nil {
        log.Printf("❌ Ошибка выполнения запроса получения штрафов пользователя %d за месяц %s: %v", userID, month, err)
        return nil, err
    }
    defer rows.Close()
    
    var fines []*models.Fine
    for rows.Next() {
        var fine models.Fine
        err := rows.Scan(
            &fine.ID,
            &fine.Name,
            &fine.Price,
            &fine.UserID,
            &fine.CreatedAt,
        )
        if err != nil {
            log.Printf("❌ Ошибка сканирования штрафа: %v", err)
            return nil, err
        }
        
        fines = append(fines, &fine)
    }
    
    if err := rows.Err(); err != nil {
        log.Printf("❌ Ошибка при работе с результатами запроса штрафов: %v", err)
        return nil, err
    }
    
    log.Printf("✅ Успешно получено штрафов для пользователя %d за месяц %s: %d", userID, month, len(fines))
    return fines, nil
}

// GetUserBonuses получает все премии для пользователя за указанный месяц
func (r *UserRepository) GetUserBonuses(userID int64, month string) ([]*models.Bonus, error) {
    query := `
        SELECT id, name, price, user_id, created_at
        FROM bonuses
        WHERE user_id = $1 AND to_char(created_at, 'YYYY-MM') = $2
        ORDER BY created_at DESC
    `
    
    rows, err := r.db.Query(query, userID, month)
    if err != nil {
        log.Printf("❌ Ошибка выполнения запроса получения премий пользователя %d за месяц %s: %v", userID, month, err)
        return nil, err
    }
    defer rows.Close()
    
    var bonuses []*models.Bonus
    for rows.Next() {
        var bonus models.Bonus
        err := rows.Scan(
            &bonus.ID,
            &bonus.Name,
            &bonus.Price,
            &bonus.UserID,
            &bonus.CreatedAt,
        )
        if err != nil {
            log.Printf("❌ Ошибка сканирования премии: %v", err)
            return nil, err
        }
        
        bonuses = append(bonuses, &bonus)
    }
    
    if err := rows.Err(); err != nil {
        log.Printf("❌ Ошибка при работе с результатами запроса премий: %v", err)
        return nil, err
    }
    
    log.Printf("✅ Успешно получено премий для пользователя %d за месяц %s: %d", userID, month, len(bonuses))
    return bonuses, nil
}

// CreateFineTemplate создает новый шаблон штрафа
func (r *UserRepository) CreateFineTemplate(template *models.FineTemplate) error {
    query := `
        INSERT INTO fine_templates (name, price)
        VALUES ($1, $2)
        RETURNING id
    `
    
    err := r.db.QueryRow(query, template.Name, template.Price).Scan(&template.ID)
    if err != nil {
        log.Printf("❌ Ошибка создания шаблона штрафа: %v", err)
        return err
    }
    
    log.Printf("✅ Успешно создан шаблон штрафа с ID: %d", template.ID)
    return nil
}

// CreateBonusTemplate создает новый шаблон премии
func (r *UserRepository) CreateBonusTemplate(template *models.BonusTemplate) error {
    query := `
        INSERT INTO bonus_templates (name, price)
        VALUES ($1, $2)
        RETURNING id
    `
    
    err := r.db.QueryRow(query, template.Name, template.Price).Scan(&template.ID)
    if err != nil {
        log.Printf("❌ Ошибка создания шаблона премии: %v", err)
        return err
    }
    
    log.Printf("✅ Успешно создан шаблон премии с ID: %d", template.ID)
    return nil
}

// CreateBonus создает новую премию
func (r *UserRepository) CreateBonus(bonus *models.Bonus) error {
    query := `
        INSERT INTO bonuses (name, price, user_id)
        VALUES ($1, $2, $3)
        RETURNING id, created_at
    `
    
    err := r.db.QueryRow(query, bonus.Name, bonus.Price, bonus.UserID).Scan(&bonus.ID, &bonus.CreatedAt)
    if err != nil {
        log.Printf("❌ Ошибка создания премии: %v", err)
        return err
    }
    
    log.Printf("✅ Успешно создана премия с ID: %d для пользователя %d", bonus.ID, bonus.UserID)
    return nil
}

// CreateFine создает новый штраф
func (r *UserRepository) CreateFine(fine *models.Fine) error {
    query := `
        INSERT INTO fines (name, price, user_id)
        VALUES ($1, $2, $3)
        RETURNING id, created_at
    `
    
    err := r.db.QueryRow(query, fine.Name, fine.Price, fine.UserID).Scan(&fine.ID, &fine.CreatedAt)
    if err != nil {
        log.Printf("❌ Ошибка создания штрафа: %v", err)
        return err
    }
    
    log.Printf("✅ Успешно создан штраф с ID: %d для пользователя %d", fine.ID, fine.UserID)
    return nil
}

// DeleteFineTemplate удаляет шаблон штрафа по ID
func (r *UserRepository) DeleteFineTemplate(id int64) error {
    query := `DELETE FROM fine_templates WHERE id = $1`
    
    result, err := r.db.Exec(query, id)
    if err != nil {
        log.Printf("❌ Ошибка удаления шаблона штрафа с ID %d: %v", id, err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        log.Printf("⚠️ Шаблон штрафа с ID %d не найден", id)
        return fmt.Errorf("шаблон штрафа с ID %d не найден", id)
    }
    
    log.Printf("✅ Успешно удален шаблон штрафа с ID: %d", id)
    return nil
}

// DeleteBonusTemplate удаляет шаблон премии по ID
func (r *UserRepository) DeleteBonusTemplate(id int64) error {
    query := `DELETE FROM bonus_templates WHERE id = $1`
    
    result, err := r.db.Exec(query, id)
    if err != nil {
        log.Printf("❌ Ошибка удаления шаблона премии с ID %d: %v", id, err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        log.Printf("⚠️ Шаблон премии с ID %d не найден", id)
        return fmt.Errorf("шаблон премии с ID %d не найден", id)
    }
    
    log.Printf("✅ Успешно удален шаблон премии с ID: %d", id)
    return nil
}

// DeleteBonus удаляет премию по ID
func (r *UserRepository) DeleteBonus(id int64) error {
    query := `DELETE FROM bonuses WHERE id = $1`
    
    result, err := r.db.Exec(query, id)
    if err != nil {
        log.Printf("❌ Ошибка удаления премии с ID %d: %v", id, err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        log.Printf("⚠️ Премия с ID %d не найдена", id)
        return fmt.Errorf("премия с ID %d не найдена", id)
    }
    
    log.Printf("✅ Успешно удалена премия с ID: %d", id)
    return nil
}

// DeleteFine удаляет штраф по ID
func (r *UserRepository) DeleteFine(id int64) error {
    query := `DELETE FROM fines WHERE id = $1`
    
    result, err := r.db.Exec(query, id)
    if err != nil {
        log.Printf("❌ Ошибка удаления штрафа с ID %d: %v", id, err)
        return err
    }
    
    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        log.Printf("⚠️ Штраф с ID %d не найден", id)
        return fmt.Errorf("штраф с ID %d не найден", id)
    }
    
    log.Printf("✅ Успешно удален штраф с ID: %d", id)
    return nil
}


