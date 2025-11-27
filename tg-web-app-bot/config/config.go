package config

import (
	"os"
)

type Config struct {
	TelegramBotToken string
	WebAppURL        string
	DBHost           string
	DBPort           string
	DBUser           string
	DBPassword       string
	DBName           string
	MQTT_Server			 string
}

func Load() *Config {
	return &Config{
		TelegramBotToken: os.Getenv("TELEGRAM_BOT_TOKEN"),
		WebAppURL:        os.Getenv("WEB_APP_URL"),
		DBHost:           os.Getenv("DB_HOST"),
		DBPort:           os.Getenv("DB_PORT"),
		DBUser:           os.Getenv("DB_USER"),
		DBPassword:       os.Getenv("DB_PASSWORD"),
		DBName:           os.Getenv("DB_NAME"),
		MQTT_Server:			os.Getenv("MQTT_SERVER"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}