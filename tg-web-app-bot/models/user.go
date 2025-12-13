package models

import (
	"time"
)

type User struct {
	ID          int64     `json:"id" db:"id"`
	TelegramID  int64     `json:"telegram_id" db:"telegram_id"`
	Username    string    `json:"username" db:"username"`
	FirstName   string    `json:"first_name" db:"first_name"`
	LastName    string    `json:"last_name" db:"last_name"`
	PhoneNumber string    `json:"phone_number" db:"phone_number"`
	Confirmed   bool      `json:"confirmed" db:"confirmed"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	IsAdmin     bool      `json:"is_admin" db:"is_admin"`
	ChatID      *int64    `json:"chat_id,omitempty" db:"chat_id"`
}

type WebAppData struct {
	Action         string `json:"action"`
	UserID         int64  `json:"user_id"`
	Username       string `json:"username"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	Language       string `json:"language"`
	IsPremium      bool   `json:"is_premium"`
	AllowsWriteToPm bool   `json:"allows_write_to_pm"`
	Platform       string `json:"platform"`
	Timestamp      string `json:"timestamp"`
	Data           string `json:"data"`
}

type PhoneUpdate struct {
    UserID      int64  `json:"user_id"`
    PhoneNumber string `json:"phone_number"`
    Action      string `json:"action"`
}

type Zone struct {
    ID           int64  `json:"id"`
    Name         string `json:"name"`
    Description  *string `json:"description"`
    WorkingHours string `json:"working_hours"` // формат "9:00 - 16:00"
    ImagePath    string `json:"image_path"`
		Price        *float64 `json:"price"`
}

type Checklist struct {
    ID          int64      `json:"id"`
    Date        string     `json:"date"`         // формат "дд.мм.гггг"
    ZoneID      int64      `json:"zone_id"`
    Description string     `json:"description"`
    Photo       string     `json:"photo"`        // путь к фото
    Status      bool       `json:"status"`       // true = активен/выполнен, false = неактивен/отменен
    IssueTime   time.Time  `json:"issue_time"`   // дата и время выдачи
    ReturnTime *time.Time `json:"return_time"`  // дата и время сдачи (может быть nil)
    AdminID     *int64      `json:"admin_id"`
    Confirmed   bool       `json:"confirmed"`    // подтвержден или нет
    Important   bool       `json:"important"`    // важный чек-лист или нет
}

type Auto_cheklst struct {
    ID          int64      `json:"id"`
    ZoneID      int64      `json:"zone_id"`
    Description string     `json:"description"`
    Important   bool       `json:"important"`
}

type Schedule struct {
    ID               int64   `json:"id" db:"id"`
    WorkerID         int64   `json:"worker_id" db:"worker_id"`
    ZoneID           *int64  `json:"zone_id,omitempty" db:"zone_id"`
    HourlyRate       float64 `json:"hourly_rate" db:"hourly_rate"`
    Date             string  `json:"date" db:"date"` // Format: YYYY-MM-DD
    PlannedStartTime string  `json:"planned_start_time" db:"planned_start_time"`
    PlannedEndTime   string `json:"planned_end_time" db:"planned_end_time"`
    ActualStartTime  *string `json:"actual_start_time,omitempty" db:"actual_start_time"`
    ActualEndTime    *string `json:"actual_end_time,omitempty" db:"actual_end_time"`
    PhotoStart       *string `json:"photo_start,omitempty" db:"photo_start"`
    PhotoEnd         *string `json:"photo_end,omitempty" db:"photo_end"`
    Price        float64 `json:"price"`
}

type FineTemplate struct {
    ID    int64   `json:"id" db:"id"`
    Name  string  `json:"name" db:"name"`
    Price float64 `json:"price" db:"price"`
}

type Fine struct {
    ID        int64     `json:"id" db:"id"`
    Name      string    `json:"name" db:"name"`
    Price     float64   `json:"price" db:"price"`
    UserID    int64     `json:"user_id" db:"user_id"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type BonusTemplate struct {
    ID    int64   `json:"id" db:"id"`
    Name  string  `json:"name" db:"name"`
    Price float64 `json:"price" db:"price"`
}

type Bonus struct {
    ID        int64     `json:"id" db:"id"`
    Name      string    `json:"name" db:"name"`
    Price     float64   `json:"price" db:"price"`
    UserID    int64     `json:"user_id" db:"user_id"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}