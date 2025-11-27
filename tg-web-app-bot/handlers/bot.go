// handlers/bot.go
package handlers

import (
	"log"
	"net/url"
	"strconv"
	"tg-web-app-bot/services"

	tele "gopkg.in/telebot.v4"
)

type BotHandlers struct {
	userService *services.UserService
	webAppURL   string
}

func NewBotHandlers(userService *services.UserService, webAppURL string) *BotHandlers {
	return &BotHandlers{
		userService: userService,
		webAppURL:   webAppURL,
	}
}

func (h *BotHandlers) HandleStart(c tele.Context) error {
	// Получаем данные пользователя из контекста бота
	user := c.Sender()
	if user == nil {
		return c.Send("❌ Не удалось получить данные пользователя")
	}

	// Проверяем существование пользователя и получаем его данные
	existingUser, err := h.userService.GetOrCreateUser(user.ID, user.Username, user.FirstName, user.LastName)
	if err != nil {
	log.Printf("❌ Ошибка получения/создания пользователя: %v", err)
		return c.Send("❌ Ошибка обработки данных")
	}

	// Обновляем chat_id пользователя, если он изменился
	if existingUser.ChatID == nil || *existingUser.ChatID != user.ID {
		err = h.userService.UpdateUserChatID(user.ID, user.ID)
		if err != nil {
			log.Printf("⚠️ Ошибка обновления chat_id для пользователя %d: %v", user.ID, err)
		}
	}

	log.Printf("✅ Пользователь обработан: %s (ID: %d, confirmed: %t)",
		user.FirstName, user.ID, existingUser.Confirmed)

	// Создаем URL с параметрами пользователя
	webAppURL, err := url.Parse(h.webAppURL)
	if err != nil {
		return c.Send("❌ Ошибка формирования ссылки")
	}

	query := webAppURL.Query()
	query.Add("id", strconv.FormatInt(existingUser.ID, 10))
	query.Add("tg_user_id", strconv.FormatInt(user.ID, 10))
	query.Add("tg_confirmed", strconv.FormatBool(existingUser.Confirmed))
	if user.Username != "" {
		query.Add("tg_username", user.Username)
	}
	if user.FirstName != "" {
		query.Add("tg_first_name", user.FirstName)
	}
	if user.LastName != "" {
		query.Add("tg_last_name", user.LastName)
	}
	
	webAppURL.RawQuery = query.Encode()

	menu := &tele.ReplyMarkup{}
	webApp := &tele.WebApp{URL: webAppURL.String()}
	btn := menu.WebApp("📱 Открыть приложение", webApp)
	menu.Inline(menu.Row(btn))
	log.Printf("✅ Список зон отправлен, количество: %s", webApp)
	return c.Send("Нажми кнопку чтобы открыть приложение:", menu)
}

func (h *BotHandlers) HandleWebAppData(c tele.Context) error {
	// Эта функция может остаться для обработки других данных от веб-приложения
	return c.Send("✅ Веб-приложение открыто")
}

func (h *BotHandlers) HandleText(c tele.Context) error {
	return c.Send("Напиши /start чтобы открыть веб-приложение")
}