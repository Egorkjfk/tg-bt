package database

import (
	"database/sql"
	"fmt"
	"log"
	"tg-web-app-bot/config"
	"time"

	_ "github.com/lib/pq"
)

func NewPostgresDB(cfg *config.Config) (*sql.DB, error) {
	// Формируем строку подключения из конфига
	connStr := fmt.Sprintf("postgresql://%s:%s@%s/%s?sslmode=disable",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBName,
	)//disable на require менять в зависимости от бд
	
	log.Printf("🔗 Подключаемся к БД: postgres://%s:***@%s:%s/%s", 
		cfg.DBUser, cfg.DBHost, cfg.DBPort, cfg.DBName)
	
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err = db.Ping(); err != nil {
		return nil, err
	}

	var dbTime time.Time
err = db.QueryRow("SELECT NOW()").Scan(&dbTime)
if err != nil {
    log.Printf("❌ Ошибка проверки времени: %v", err)
} else {
    log.Printf("🕒 Текущее время в БД: %v", dbTime)
}

	log.Println("✅ Успешное подключение к PostgreSQL")
	return db, nil
}