import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import { API_ENDPOINTS } from './constants/api'

export const AdminMQTTContext = createContext()

export const AdminMQTTProvider = ({ children, userData }) => {
	const [connected, setConnected] = useState(false)
	const [messages, setMessages] = useState([])
	const clientRef = useRef(null)
	const [zones, setZones] = useState([])
	const initializedRef = useRef(false)

	// Подключение к MQTT - ТОЛЬКО ЧЕРЕЗ CDN!
	useEffect(() => {
		console.log('_____________админ_____________')
		console.log(userData)
		console.log('__________________________')

		// Проверяем, что все данные пользователя загружены и пользователь - админ
		if (!userData || !userData.id || userData.is_admin !== true) {
			console.log(
				'🚫 Админский MQTT отключен - пользователь не админ или данные неполные'
			)

			// Если уже был инициализирован, но данные стали невалидными - очищаем
			if (initializedRef.current && clientRef.current) {
				console.log('🧹 Очистка MQTT подключения из-за невалидных данных')
				clientRef.current.end()
				clientRef.current = null
				setConnected(false)
				initializedRef.current = false
			}
			return
		}

		// Защита от многократного выполнения
		if (initializedRef.current) {
			console.log('⚠️ MQTT-провайдер администратора уже инициализирован')
			return
		}

		console.log(
			'🔄 Инициализация MQTT подключения для администратора через CDN...'
		)
		initializedRef.current = true

		// Проверяем, что MQTT доступен глобально
		if (typeof window.mqtt === 'undefined') {
			console.error('❌ MQTT не найден в глобальной области видимости')
			initializedRef.current = false
			return
		}

		// ТОЧНО ТАК ЖЕ КАК В РАБОЧЕМ HTML ПРИМЕРЕ!
		const client = window.mqtt.connect('wss://fly-park.ru:3000/mqtt', {
			clientId:
				'admin_' + userData.id + '_' + Math.random().toString(16).substr(2, 8),
			keepalive: 30,
		})

		client.on('connect', () => {
			console.log('✅ Админ подключен к MQTT')
			setConnected(true)

			// Подписываемся на админский топик
			const adminTopic = 'admin_notifications'
			client.subscribe(adminTopic, { qos: 1 }, err => {
				if (err) {
					console.error('❌ Ошибка подписки на админ топик:', err)
				} else {
					console.log('👑 Подписка на админ топик установлена')
				}
			})

			// Загружаем список зон и подписываемся на них
			fetchAndSubscribeToZones(client)
		})

		// Обработка сообщений
		client.on('message', (topic, message) => {
			try {
				const parsedMessage = JSON.parse(message.toString())
				console.log(`📥 MQTT сообщение из топика ${topic}:`, parsedMessage)

				setMessages(prev => [
					...prev,
					{
						...parsedMessage,
						topic,
						timestamp: Date.now(),
					},
				])
			} catch (err) {
				console.error('❌ Ошибка обработки MQTT сообщения:', err)
			}
		})

		// Обработка ошибок
		client.on('error', error => {
			console.error('❌ MQTT ошибка:', error)
			setConnected(false)
		})

		// Обработка отключения
		client.on('close', () => {
			console.log('🔌 MQTT соединение закрыто')
			setConnected(false)
		})

		clientRef.current = client

		const fetchAndSubscribeToZones = async mqttClient => {
			try {
				console.log('📍 Начинаем подписку на зоны...')

				const response = await fetch(API_ENDPOINTS.GET_ALL_ZONES, {
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				})

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`)
				}

				const result = await response.json()
				if (result.status === 'success' && result.zones) {
					setZones(result.zones)

					// Подписываемся на топики всех зон
					result.zones.forEach(zone => {
						const zoneTopic = `zone_${zone.id}`
						mqttClient.subscribe(zoneTopic, { qos: 1 }, err => {
							if (err) {
								console.error(
									`❌ Ошибка подписки на топик зоны ${zone.id}:`,
									err
								)
							} else {
								console.log(`📍 Подписка на топик зоны ${zone.id} установлена`)
							}
						})
					})
					console.log(`✅ Админ подписан на ${result.zones.length} зон`)
				}
			} catch (error) {
				console.error('❌ Ошибка получения списка зон:', error)
				// Fallback подписка
				console.log('🔄 Используем fallback подписку на зоны 1-6')
				for (let zoneId = 1; zoneId <= 6; zoneId++) {
					const zoneTopic = `zone_${zoneId}`
					mqttClient.subscribe(zoneTopic, { qos: 1 }, err => {
						if (err) {
							console.error(`❌ Ошибка подписки на топик зоны ${zoneId}:`, err)
						} else {
							console.log(
								`📍 Подписка на топик зоны ${zoneId} установлена (fallback)`
							)
						}
					})
				}
			}
		}
	}, [userData])

	// Функция для публикации сообщений
	const publish = (topic, message) => {
		if (clientRef.current && connected) {
			clientRef.current.publish(topic, JSON.stringify(message), { qos: 1 })
			console.log(`📤 Отправлено сообщение в топик ${topic}:`, message)
		}
	}

	const publishToUser = (userId, message) => {
		if (clientRef.current && connected) {
			const userTopic = `user_${userId}_confirmation`
			clientRef.current.publish(userTopic, JSON.stringify(message), { qos: 1 })
			console.log(`📤 Отправлено сообщение пользователю ${userId}:`, message)
		}
	}

	const publishToZone = (zoneId, message) => {
		if (clientRef.current && connected) {
			const zoneTopic = `zone_${zoneId}`
			clientRef.current.publish(zoneTopic, JSON.stringify(message), { qos: 1 })
			console.log(`📤 Отправлено сообщение в зону ${zoneId}:`, message)
		}
	}

	return (
		<AdminMQTTContext.Provider
			value={{
				connected,
				messages,
				publish,
				publishToUser,
				publishToZone,
				zones,
				isAdmin: userData?.is_admin === true,
			}}
		>
			{children}
		</AdminMQTTContext.Provider>
	)
}

export const useAdminMQTT = () => {
	const context = useContext(AdminMQTTContext)
	if (!context) {
		throw new Error('useAdminMQTT must be used within AdminMQTTProvider')
	}
	return context
}
