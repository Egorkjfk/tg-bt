package main

import (
	"log"
	"net/http"
	"tg-web-app-bot/config"
	"tg-web-app-bot/database"
	"tg-web-app-bot/handlers"
	"tg-web-app-bot/repository"
	"tg-web-app-bot/services"
	"time"

	"github.com/joho/godotenv"
	tele "gopkg.in/telebot.v4"
)

func main() {
	// Загружаем .env файл
	if err := godotenv.Load(); err != nil {
		log.Printf("⚠️  .env файл не найден, используем переменные окружения")
	}

	// Загружаем конфигурацию
	cfg := config.Load()
	if cfg.TelegramBotToken == "" || cfg.WebAppURL == "" {
		log.Fatal("❌ TELEGRAM_BOT_TOKEN or WEB_APP_URL not set")
	}

	// Проверяем данные БД
	if cfg.DBHost == "" || cfg.DBUser == "" || cfg.DBPassword == "" || cfg.DBName == "" {
		log.Fatal("❌ DB credentials not set in .env")
	}

	// Подключаемся к базе данных
	db, err := database.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("❌ Ошибка подключения к БД: %v", err)
	}
	defer db.Close()

	// Настраиваем бота С ПРОКСИ только для Telegram API
// dialer, err := proxy.SOCKS5("tcp", "185.54.178.193:1080", nil, proxy.Direct)
// if err != nil {
//     log.Fatal("❌ Ошибка создания SOCKS5 прокси:", err)
// }

// httpClient := &http.Client{
//     Transport: &http.Transport{
//         Dial: dialer.Dial,
//     },
//     Timeout: 30 * time.Second,
// }
//  dialSocksProxy := socks.Dial("socks4://185.54.178.193:1080?timeout=30s")

//     // 2. Настраиваем HTTP-транспорт
//     tr := &http.Transport{
//         Dial: dialSocksProxy,
//     }

//     // 3. Создаем HTTP-клиент
//     httpClient := &http.Client{
//         Transport: tr,
//         Timeout:   30 * time.Second,
//     }


pref := tele.Settings{
    Token:  cfg.TelegramBotToken,
    Poller: &tele.LongPoller{Timeout: 10 * time.Second},
    //Client: httpClient, 
}

b, err := tele.NewBot(pref)
if err != nil {
    log.Fatal("❌ Ошибка создания бота:", err)
}

	// Инициализируем слои приложения
	userRepo := repository.NewUserRepository(db)
	
	// Инициализируем MQTT сервис
	mqttService := services.NewMQTTService(cfg, userRepo)
	if mqttService == nil {
		log.Fatal("❌ Не удалось инициализировать MQTT сервис")
	}
	defer mqttService.Close()
	
	userService := services.NewUserServiceWithBotAndMQTT(userRepo, b, mqttService)
	
	// Инициализируем обработчики
	botHandlers := handlers.NewBotHandlers(userService, cfg.WebAppURL)
	httpHandlers := handlers.NewHTTPHandlers(userService)
	// Инициализируем планировщик задач
	taskScheduler := services.NewTaskScheduler(userService)
	taskScheduler.StartAllTasks()

	http.Handle("/api/update-user-full", handlers.StandardMiddlewareChain(httpHandlers.HandleUpdateUserFull))
	// Настраиваем HTTP маршруты с использованием стандартной цепочки middleware
	http.Handle("/api/update-phone", handlers.StandardMiddlewareChain(httpHandlers.HandlePhoneUpdate))
	http.Handle("/api/get-user", handlers.StandardMiddlewareChain(httpHandlers.HandleGetUser))
	http.Handle("/api/get-allUser", handlers.StandardMiddlewareChain(httpHandlers.HandleGetAllUser))
	http.Handle("/api/get-allZones", handlers.StandardMiddlewareChain(httpHandlers.HandleGetAllZones))
	http.Handle("/api/create-zone", handlers.StandardMiddlewareChain(httpHandlers.HandleCreateZone))
	http.Handle("/api/update-zone", handlers.StandardMiddlewareChain(httpHandlers.HandleUpdateZone))
		http.Handle("/api/drop-zone", handlers.StandardMiddlewareChain(httpHandlers.HandleDropZone))
http.Handle("/api/delete-user", handlers.StandardMiddlewareChain(httpHandlers.HandleDeleteUser))

	http.Handle("/api/get-checklists", handlers.StandardMiddlewareChain(httpHandlers.HandleGetChecklists))
    http.Handle("/api/create-checklist", handlers.StandardMiddlewareChain(httpHandlers.HandleCreateChecklist))
http.Handle("/api/update-checklist-description", handlers.StandardMiddlewareChain(httpHandlers.HandleUpdateChecklistDescription))
http.Handle("/api/delete-checklist", handlers.StandardMiddlewareChain(httpHandlers.HandleDeleteChecklist))
	http.Handle("/api/create-auto-checklist", handlers.StandardMiddlewareChain(httpHandlers.HandleCreateAutoChecklist))
		http.Handle("/api/delete-auto-checklist", handlers.StandardMiddlewareChain(httpHandlers.HandleDeleteAutoChecklist))
		http.Handle("/api/get-auto-checklist", handlers.StandardMiddlewareChain(httpHandlers.HandleGetAutoChecklists))
		http.Handle("/api/update-auto-checklist", handlers.StandardMiddlewareChain(httpHandlers.HandleUpdateAutoChecklist))



		http.Handle("/api/create-schedule", handlers.StandardMiddlewareChain(httpHandlers.HandleCreateSchedule))
http.Handle("/api/update-actual-start-time", handlers.StandardMiddlewareChain(httpHandlers.HandleUpdateActualStartTime))
http.Handle("/api/update-actual-end-time", handlers.StandardMiddlewareChain(httpHandlers.HandleUpdateActualEndTime))
http.Handle("/api/get-worker-weekly-schedule", handlers.StandardMiddlewareChain(httpHandlers.HandleGetWorkerWeeklySchedule))
http.Handle("/api/get-all-workers-weekly-schedule", handlers.StandardMiddlewareChain(httpHandlers.HandleGetAllWorkersWeeklySchedule))
http.Handle("/api/update-checklist-confirmed", handlers.StandardMiddlewareChain(httpHandlers.HandleUpdateChecklistConfirmed))
http.Handle("/api/upload-zone-image", handlers.StandardMiddlewareChain(httpHandlers.HandleUploadZoneImage))
http.Handle("/api/update-user-confirmed", handlers.StandardMiddlewareChain(httpHandlers.HandleUpdateUserConfirmed))
http.Handle("/api/calculate-salary", handlers.StandardMiddlewareChain(httpHandlers.HandleCalculateSalary))
	http.Handle("/api/delete-schedule", handlers.StandardMiddlewareChain(httpHandlers.HandleDeleteSchedule))
http.Handle("/api/get-all-salaries", handlers.StandardMiddlewareChain(httpHandlers.HandleGetAllSalaries))


	// Добавляем новый эндпоинт для получения чеклистов пользователя
	http.Handle("/api/get-worker-checklists", handlers.StandardMiddlewareChain(httpHandlers.HandleGetWorkerChecklists))
	
	// Добавляем эндпоинт для загрузки фото чеклиста
	//http.Handle("/api/upload-checklist-photo", handlers.StandardMiddlewareChain(httpHandlers.HandleUploadChecklistPhoto))
http.Handle("/api/add-checklist-photo", handlers.StandardMiddlewareChain(httpHandlers.HandleAddChecklistPhoto))
	http.Handle("/api/update-checklist-status", handlers.StandardMiddlewareChain(httpHandlers.HandleUpdateChecklistStatus))
	// Добавляем эндпоинт для получения текущей даты с сервера
	http.Handle("/api/get-current-date", handlers.StandardMiddlewareChain(httpHandlers.HandleGetCurrentDate))

	// Шаблоны штрафов
http.Handle("/api/get-all-fine-templates", handlers.StandardMiddlewareChain(httpHandlers.HandleGetAllFineTemplates))
http.Handle("/api/create-fine-template", handlers.StandardMiddlewareChain(httpHandlers.HandleCreateFineTemplate))
http.Handle("/api/delete-fine-template", handlers.StandardMiddlewareChain(httpHandlers.HandleDeleteFineTemplate))

// Шаблоны премий
http.Handle("/api/get-all-bonus-templates", handlers.StandardMiddlewareChain(httpHandlers.HandleGetAllBonusTemplates))
http.Handle("/api/create-bonus-template", handlers.StandardMiddlewareChain(httpHandlers.HandleCreateBonusTemplate))
http.Handle("/api/delete-bonus-template", handlers.StandardMiddlewareChain(httpHandlers.HandleDeleteBonusTemplate))

// Премии пользователей
http.Handle("/api/get-user-bonuses", handlers.StandardMiddlewareChain(httpHandlers.HandleGetUserBonuses))
http.Handle("/api/create-bonus", handlers.StandardMiddlewareChain(httpHandlers.HandleCreateBonus))
http.Handle("/api/delete-bonus", handlers.StandardMiddlewareChain(httpHandlers.HandleDeleteBonus))

// Штрафы пользователей
http.Handle("/api/get-user-fines", handlers.StandardMiddlewareChain(httpHandlers.HandleGetUserFines))
http.Handle("/api/create-fine", handlers.StandardMiddlewareChain(httpHandlers.HandleCreateFine))
http.Handle("/api/delete-fine", handlers.StandardMiddlewareChain(httpHandlers.HandleDeleteFine))




	

	http.Handle("/list/", http.StripPrefix("/list/", http.FileServer(http.Dir("./public/list/"))))
	 	http.Handle("/zones/", http.StripPrefix("/zones/", http.FileServer(http.Dir("./public/zones/"))))
	 	http.Handle("/smena/", http.StripPrefix("/smena/", http.FileServer(http.Dir("./public/smena/"))))

http.Handle("/api/get-all-checklist-photos", handlers.StandardMiddlewareChain(httpHandlers.HandleGetAllChecklistsWithPhotos))
http.Handle("/api/delete-checklists", handlers.StandardMiddlewareChain(httpHandlers.HandleDeleteChecklistsByIDs))
	 	
	
	// Запускаем HTTP сервер в отдельной горутине
	go func() {
	log.Printf("🌐 HTTP сервер запущен на порту 7778")
		log.Fatal(http.ListenAndServe(":7778", nil))
	}()

	// Отладочный обработчик для всех сообщений
	b.Handle(tele.OnText, func(c tele.Context) error {
		log.Printf("📨 Получено текстовое сообщение: %s", c.Text())
		return botHandlers.HandleText(c)
	})

	// Регистрируем обработчики
	b.Handle("/start", botHandlers.HandleStart)
	// main.go (добавь этот обработчик)

	b.Handle(tele.OnWebApp, botHandlers.HandleWebAppData)

	log.Println("🌐 HTTP API доступен на порту 7778")
	log.Printf("🗄️  Database: %s:%s", cfg.DBHost, cfg.DBPort)

	b.Start()
}