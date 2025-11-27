package services

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"tg-web-app-bot/config"
	"tg-web-app-bot/models"
	"tg-web-app-bot/repository"
)

type MQTTService struct {
	client    mqtt.Client
	userRepo  *repository.UserRepository
	config    *config.Config
	topics    map[int64]string // zone_id -> topic
	adminTopic string          // topic for admin notifications
}

// ChecklistMessage структура для сообщения о новом чек-листе
type ChecklistMessage struct {
	Type        string     `json:"type"`         // Тип сообщения - "checklist"
	Subtype     string     `json:"subtype"`      // Подтип сообщения - "checklist_created"
	ChecklistID int64      `json:"checklist_id"` // ID чек-листа
	ZoneID      int64      `json:"zone_id"`      // ID зоны
	Description string     `json:"description"`  // Описание чек-листа
	AdminID     int64      `json:"admin_id"`     // ID администратора
	Date        string     `json:"date"`         // Дата создания
	IssueTime   string     `json:"issue_time"`   // Время создания
	Timestamp   string     `json:"timestamp"`    // Время отправки
	Photo       string     `json:"photo"`        // Путь к фото
	Status      bool       `json:"status"`       // Статус выполнения
	ReturnTime  *time.Time `json:"return_time"`  // Время сдачи (может быть nil)
	Confirmed   bool       `json:"confirmed"`    // Статус подтверждения
}

// PhotoMessage структура для сообщения о загрузке фото выполненной работы
type PhotoMessage struct {
	Type        string `json:"type"`         // Тип сообщения - "photo"
	ChecklistID int64  `json:"checklist_id"` // ID чек-листа
	ZoneID      int64  `json:"zone_id"`      // ID зоны
	PhotoPath   string `json:"photo_path"`   // Путь к фото
	WorkerID    int64  `json:"worker_id"`    // ID работника
	UploadTime  string `json:"upload_time"`  // Время загрузки
}

// StatusMessage структура для сообщения об изменении статуса чек-листа
type StatusMessage struct {
	Type        string `json:"type"`          // Тип сообщения - "status"
	ChecklistID int64  `json:"checklist_id"`  // ID чек-листа
	ZoneID      int64  `json:"zone_id"`       // ID зоны
	Status      bool   `json:"status"`        // Статус выполнения (true - выполнено, false - не выполнено)
	Confirmed   bool   `json:"confirmed"`     // Статус подтверждения (true - подтверждено, false - ожидает)
	UpdateTime  string `json:"update_time"`   // Время обновления
}

func NewMQTTService(config *config.Config, userRepo *repository.UserRepository) *MQTTService {
	opts := mqtt.NewClientOptions()
	opts.AddBroker(config.MQTT_Server)
	opts.SetClientID(fmt.Sprintf("tg-web-app-bot-%d", time.Now().Unix()))
	opts.SetDefaultPublishHandler(messageHandler)
	opts.OnConnect = connectHandler
	opts.OnConnectionLost = connectLostHandler

	client := mqtt.NewClient(opts)
	
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		log.Printf("❌ Ошибка подключения к MQTT: %v", token.Error())
		return nil
	}

	log.Println("✅ Подключение к MQTT установлено")

	service := &MQTTService{
		client:   client,
		userRepo: userRepo,
		config:   config,
		topics:   make(map[int64]string),
		adminTopic: "admin_notifications", // топик для уведомлений админа
	}

	// Инициализируем топики для всех зон
	service.initializeTopics()
	
	// Подписываемся на топик админских уведомлений
	if token := service.client.Subscribe(service.adminTopic, 0, nil); token.Wait() && token.Error() != nil {
		log.Printf("❌ Ошибка подписки на топик админских уведомлений %s: %v", service.adminTopic, token.Error())
	} else {
		log.Printf("✅ Подписка на топик админских уведомлений %s установлена", service.adminTopic)
	}

	return service
}

// initializeTopics создает топики для всех зон
func (s *MQTTService) initializeTopics() {
	var zones []*models.Zone
	err := s.userRepo.GetAllZones(&zones)
	if err != nil {
		log.Printf("❌ Ошибка получения зон: %v", err)
		return
	}

	for _, zone := range zones {
		topic := fmt.Sprintf("zone_%d", zone.ID)
		s.topics[zone.ID] = topic
		
		// Подписываемся на топик (для тестирования)
		if token := s.client.Subscribe(topic, 0, nil); token.Wait() && token.Error() != nil {
			log.Printf("❌ Ошибка подписки на топик %s: %v", topic, token.Error())
		} else {
			log.Printf("✅ Подписка на топик %s установлена", topic)
		}
	}

	log.Printf("✅ Инициализировано %d топиков для зон", len(s.topics))
}

// AddZoneTopic добавляет новый топик для зоны
func (s *MQTTService) AddZoneTopic(zoneID int64) {
	topic := fmt.Sprintf("zone_%d", zoneID)
	s.topics[zoneID] = topic
	
	// Подписываемся на новый топик
	if token := s.client.Subscribe(topic, 0, nil); token.Wait() && token.Error() != nil {
		log.Printf("❌ Ошибка подписки на топик %s: %v", topic, token.Error())
	} else {
		log.Printf("✅ Подписка на топик %s установлена", topic)
	}
}

// PublishChecklistMessage публикует сообщение о новом чек-листе в соответствующий топик
func (s *MQTTService) PublishChecklistMessage(checklist *models.Checklist) error {
	// Создаем максимально полное сообщение
	fullMessage := map[string]interface{}{
		"Type":        "checklist",
		"Subtype":     "checklist_created",
		"checklist": checklist,
	}

	// Публикуем сообщение в топик зоны
	topic, exists := s.topics[checklist.ZoneID]
	if !exists {
		return fmt.Errorf("топик для зоны %d не найден", checklist.ZoneID)
	}

	zonePayload, err := json.Marshal(fullMessage)
	if err != nil {
		return fmt.Errorf("ошибка сериализации сообщения для топика зоны: %v", err)
	}

	token := s.client.Publish(topic, 0, false, zonePayload)
	token.Wait()

	if token.Error() != nil {
		return fmt.Errorf("ошибка публикации в топик %s: %v", topic, token.Error())
	}

	log.Printf("✅ Сообщение о чек-листе %d опубликовано в топик %s", checklist.ID, topic)


	token = s.client.Publish(s.adminTopic, 0, false, zonePayload)
	token.Wait()

	if token.Error() != nil {
	return fmt.Errorf("ошибка публикации в админский топик %s: %v", s.adminTopic, token.Error())
	}

	log.Printf("✅ Уведомление админу отправлено для чеклиста %d", checklist.ID)

	return nil
}

// PublishChecklistConfirmation публикует сообщение об изменении статуса подтверждения чек-листа в соответствующий топик
func (s *MQTTService) PublishChecklistConfirmation(checklist *models.Checklist) error {
	// Проверяем, что у нас есть информация о зоне
	topic, exists := s.topics[checklist.ZoneID]
	if !exists {
		return fmt.Errorf("топик для зоны %d не найден", checklist.ZoneID)
	}

	// Создаем максимально полное сообщение об изменении статуса подтверждения
adminNotification := map[string]interface{}{
		"Type":        "checklist",
		"Subtype":     "confirmation_changed",
		"checklist": checklist,
	}

	// Сериализуем сообщение
	payload, err := json.Marshal(adminNotification)
	if err != nil {
		return fmt.Errorf("ошибка сериализации сообщения об изменении подтверждения: %v", err)
	}

	// Публикуем сообщение в топик зоны
	token := s.client.Publish(topic, 0, false, payload)
	token.Wait()

	if token.Error() != nil {
		return fmt.Errorf("ошибка публикации в топик %s: %v", topic, token.Error())
	}

	log.Printf("✅ Сообщение об изменении статуса подтверждения чек-листа %d опубликовано в топик %s", checklist.ID, topic)

	// Также публикуем такое же сообщение в админский топик
	token = s.client.Publish(s.adminTopic, 0, false, payload)
	token.Wait()

	if token.Error() != nil {
		return fmt.Errorf("ошибка публикации в админский топик %s: %v", s.adminTopic, token.Error())
	}

	log.Printf("✅ Уведомление админу об изменении статуса подтверждения чек-листа %d отправлено", checklist.ID)

	return nil
}

// PublishChecklistPhoto публикует сообщение о загрузке фото чек-листа в соответствующий топик
func (s *MQTTService) PublishChecklistPhoto(checklist *models.Checklist) error {
	// Проверяем, что у нас есть информация о зоне
	topic, exists := s.topics[checklist.ZoneID]
	if !exists {
		return fmt.Errorf("топик для зоны %d не найден", checklist.ZoneID)
	}

	// Создаем максимально полное сообщение о загрузке фото
	adminNotification := map[string]interface{}{
		"Type":        "checklist",
		"Subtype":     "photo_uploaded",
		"checklist": checklist,
	}

	// Сериализуем сообщение
	payload, err := json.Marshal(adminNotification)
	if err != nil {
		return fmt.Errorf("ошибка сериализации сообщения о загрузке фото: %v", err)
	}

	// Публикуем сообщение в топик зоны
	token := s.client.Publish(topic, 0, false, payload)
	token.Wait()

	if token.Error() != nil {
		return fmt.Errorf("ошибка публикации в топик %s: %v", topic, token.Error())
	}

	log.Printf("✅ Сообщение о загрузке фото чек-листа %d опубликовано в топик %s", checklist.ID, topic)

	// Также публикуем такое же сообщение в админский топик
	token = s.client.Publish(s.adminTopic, 0, false, payload)
	token.Wait()

	if token.Error() != nil {
		return fmt.Errorf("ошибка публикации в админский топик %s: %v", s.adminTopic, token.Error())
	}

	log.Printf("✅ Уведомление админу о загрузке фото чек-листа %d отправлено", checklist.ID)

	return nil
}



// Close закрывает соединение с MQTT
func (s *MQTTService) Close() {
	if s.client.IsConnected() {
		s.client.Disconnect(250)
		log.Println("✅ Соединение с MQTT закрыто")
	}
}

// UserNotificationMessage структура для сообщения о новом пользователе
type UserNotificationMessage struct {
	Type        string      `json:"type"`         // Тип сообщения - "user_notification"
	UserID      int64       `json:"user_id"`      // ID пользователя в БД
	TelegramID  int64       `json:"telegram_id"`  // Telegram ID пользователя
	Username    string      `json:"username"`     // Username пользователя
	FirstName   string      `json:"first_name"`   // Имя пользователя
	LastName    string      `json:"last_name"`    // Фамилия пользователя
	PhoneNumber string      `json:"phone_number"` // Номер телефона пользователя
	Confirmed   bool        `json:"confirmed"`    // Статус подтверждения
	CreatedAt   string      `json:"created_at"`   // Время создания
}

// PublishUserNotification публикует сообщение о новом пользователе в топик админских уведомлений
func (s *MQTTService) PublishUserNotification(user *models.User) error {
	message := UserNotificationMessage{
		Type:        "user_notification",
		UserID:      user.ID,
		TelegramID:  user.TelegramID,
		Username:    user.Username,
	FirstName:   user.FirstName,
		LastName:    user.LastName,
	PhoneNumber: user.PhoneNumber,
		Confirmed:   user.Confirmed,
		CreatedAt:   user.CreatedAt.Format("2006-01-02 15:04:05"),
	}

	payload, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("ошибка сериализации сообщения: %v", err)
	}

	token := s.client.Publish(s.adminTopic, 0, false, payload)
	token.Wait()

	if token.Error() != nil {
		return fmt.Errorf("ошибка публикации в топик %s: %v", s.adminTopic, token.Error())
	}

	log.Printf("✅ Сообщение о пользователе %d опубликовано в топик %s", user.ID, s.adminTopic)
	return nil
}

// UserConfirmationMessage структура для сообщения о подтверждении пользователя
type UserConfirmationMessage struct {
	Type        string `json:"type"`         // Тип сообщения - "user_confirmation"
	UserID      int64  `json:"user_id"`      // ID пользователя в БД
	TelegramID int64  `json:"telegram_id"`  // Telegram ID пользователя
	Confirmed   bool   `json:"confirmed"`    // Статус подтверждения
	ConfirmedAt string `json:"confirmed_at"` // Время подтверждения
}

// PublishUserConfirmation публикует сообщение о подтверждении пользователя в персональный топик
func (s *MQTTService) PublishUserConfirmation(userID int64, telegramID int64, confirmed bool) error {
	message := UserConfirmationMessage{
		Type:        "user_confirmation",
		UserID:      userID,
		TelegramID:  telegramID,
		Confirmed:   confirmed,
		ConfirmedAt: time.Now().Format("2006-01-02 15:04:05"),
	}

	payload, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("ошибка сериализации сообщения: %v", err)
	}

	// Публикуем в персональный топик пользователя
	topic := fmt.Sprintf("user_%d_confirmation", userID)
	token := s.client.Publish(topic, 0, false, payload)
	token.Wait()

	if token.Error() != nil {
		return fmt.Errorf("ошибка публикации в топик %s: %v", topic, token.Error())
	}

	log.Printf("✅ Сообщение о подтверждении пользователя %d опубликовано в топик %s", userID, topic)
	return nil
}

// PublishUserConfirmation публикует сообщение о подтверждении пользователя в персональный топик
func (s *MQTTService) PublishUserSchedule(schedule *models.Schedule) error {

	message := map[string]interface{}{
		"type":        "user_schedules",
		"schedule":    schedule,
	}

	payload, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("ошибка сериализации сообщения: %v", err)
	}

	// Публикуем в персональный топик пользователя
	topic := fmt.Sprintf("user_%d_confirmation", schedule.WorkerID)
	token := s.client.Publish(topic, 0, false, payload)
	token.Wait()

	if token.Error() != nil {
		return fmt.Errorf("ошибка публикации в топик %s: %v", topic, token.Error())
	}

	log.Printf("✅ Сообщение о подтверждении пользователя %d опубликовано в топик %s", schedule.WorkerID, topic)
	return nil
}

// Handlers
var messageHandler mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	log.Printf("📥 Получено сообщение: %s из топика: %s", msg.Payload(), msg.Topic())
}

var connectHandler mqtt.OnConnectHandler = func(client mqtt.Client) {
	log.Println("✅ Подключение к MQTT установлено")
}

var connectLostHandler mqtt.ConnectionLostHandler = func(client mqtt.Client, err error) {
	log.Printf("❌ Подключение к MQTT потеряно: %v", err)
}
