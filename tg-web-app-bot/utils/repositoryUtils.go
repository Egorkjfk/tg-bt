package utils

import (
	"log"
	"time"
)

// getWeekRange возвращает даты начала и конца недели (пн-вс) для weekOffset (0 - текущая неделя, 1 - следующая, -1 - предыдущая)
func GetWeekRange(weekOffset int) (string, string) {
    now := time.Now()
    // Находим понедельник текущей недели
    offset := int(time.Monday - now.Weekday())
    if offset > 0 {
        offset = -6
    }
    monday := now.AddDate(0, 0, offset).AddDate(0, 0, weekOffset*7)
    sunday := monday.AddDate(0, 0, 6)
    
    return monday.Format("2006-01-02"), sunday.Format("2006-01-02")
}

// getMonthRange возвращает даты начала и конца месяца для monthOffset (0 - текущий месяц, 1 - следующий, -1 - предыдущий)
func GetMonthRange(monthOffset int) (string, string) {
    now := time.Now()
    // Находим первый день месяца
    firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
    // Добавляем смещение месяцев
    firstOfMonth = firstOfMonth.AddDate(0, monthOffset, 0)
    // Находим последний день месяца
    lastOfMonth := firstOfMonth.AddDate(0, 1, -1)
    
    return firstOfMonth.Format("2006-01-02"), lastOfMonth.Format("2006-01-02")
}

// formatTimeForDisplay форматирует время из базы данных в читаемый вид
func FormatTimeForDisplay(timeStr string) string {
	// Пробуем разные форматы времени
	formats := []string{
		"15:04:05",        // HH:MM:SS
		"15:04",           // HH:MM
		time.RFC3339,      // Полный формат с датой
		"2006-01-02T15:04:05Z", // ISO формат
	}
	
	for _, format := range formats {
		if t, err := time.Parse(format, timeStr); err == nil {
			// Возвращаем только время в формате HH:MM
			return t.Format("15:04")
		}
	}
	
	// Если не удалось распарсить, возвращаем исходную строку
	log.Printf("⚠️ Не удалось распарсить время: %s", timeStr)
	return timeStr
}

// Вспомогательная функция для форматирования даты
func FormatDateString(dateStr string) string {
    // Пробуем разные форматы дат
    formats := []string{
        "2006-01-02",
        "2006-01-02T15:04:05Z",
        "02.01.2006",
    }
    
    for _, format := range formats {
        parsedTime, err := time.Parse(format, dateStr)
        if err == nil {
            return parsedTime.Format("02.01.2006")
        }
    }
    
    // Если не удалось распарсить, возвращаем оригинальную строку
    return dateStr
}