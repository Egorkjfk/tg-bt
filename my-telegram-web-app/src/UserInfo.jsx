import React, { useState, useEffect } from 'react'
import {
	MainButton,
	BackButton,
	useShowPopup,
} from '@vkruglikov/react-telegram-web-app'
import { API_URL } from './constants/api'
import { useClientMQTT } from './ClientMQTT'

const UserInfo = ({ userData: initialUserData }) => {
	const showPopup = useShowPopup()
	const [userData, setUserData] = useState(initialUserData)
	const [phoneNumber, setPhoneNumber] = useState('')
	const [debugInfo, setDebugInfo] = useState('')
	const [isSending, setIsSending] = useState(false)
	
	const { connected, messages, currentZoneId, isClient } = useClientMQTT()
	
	// Отладочная информация о MQTT
	useEffect(() => {
		console.log('🔧 UserInfo MQTT статус:', {
			connected,
			currentZoneId,
			isClient,
			messagesCount: messages?.length
		});
		
		if (connected) {
			setDebugInfo(prev => prev + `✅ MQTT подключен: ${isClient ? `Zone ${currentZoneId}` : 'Unknown mode'}\n`);
		}
	}, [connected, currentZoneId, isClient]);

	// Обрабатываем MQTT сообщения для обычных пользователей
	useEffect(() => {
	  if (messages && messages.length > 0) {
	    const latestMessage = messages[messages.length - 1];
	    
	    // Обрабатываем сообщения для обычных пользователей (чек-листы, уведомления и т.д.)
	    // Обработка сообщений о новых чек-листах
	    if (latestMessage.Subtype === 'checklist_created' && latestMessage.Type === 'checklist') {
	      const checklistData = latestMessage.checklist;
	      setDebugInfo(prev => prev + `📋 Новый чек-лист: ${checklistData.description}\n`);
	      
	      showPopup({
	        title: '📋 Новый чек-лист',
	        message: checklistData.description
	      });
	    }
	    
	    // Обработка сообщений о подтверждении чек-листа
	    else if (latestMessage.Subtype === 'confirmation_changed' && latestMessage.Type === 'checklist') {
	      const checklistData = latestMessage.checklist;
	      setDebugInfo(prev => prev + `🔄 Обновление статуса чек-листа #${checklistData.id}\n`);
	      
	      // Пока просто показываем уведомление
	      if (checklistData.confirmed) {
	        showPopup({
	          title: '✅ Чек-лист подтвержден',
	          message: `Чек-лист #${checklistData.id} был подтвержден администратором`
	        });
	      } else if (checklistData.status && !checklistData.confirmed) {
	        showPopup({
	          title: '⏳ Чек-лист выполнен',
	          message: `Чек-лист #${checklistData.id} выполнен, ожидает подтверждения`
	        });
	      }
	    }
	    
	    // Обработка сообщений о загрузке фото
	    else if (latestMessage.Subtype === 'photo_uploaded' && latestMessage.Type === 'checklist') {
	      const checklistData = latestMessage.checklist;
	      setDebugInfo(prev => prev + `📸 Фото загружено для чек-листа #${checklistData.id}\n`);
	      
	      showPopup({
	        title: '📸 Фото загружено',
	        message: `Добавлено фото к чек-листу #${checklistData.id}`
	      });
	    }
	    
	    // Обрабатываем подтверждение пользователя (все пользователи получают это в персональном топике)
	    // Обработка сообщений о подтверждении пользователя (альтернативный формат)
	    else if (latestMessage.type === 'user_confirmation' && latestMessage.user_id === userData?.id) {
	      setDebugInfo(prev => prev + `✅ Пользователь подтвержден админом\n`);
	      
	      setUserData(prev => ({
	        ...prev,
	        confirmed: latestMessage.confirmed
	      }))
	      
	      showPopup({
	        title: 'Статус обновлен!',
	        message: latestMessage.confirmed
	          ? 'Ваш аккаунт был подтвержден администратором. Теперь вы можете использовать все функции приложения.'
	          : 'Ваш аккаунт был отклонен администратором. Обратитесь в поддержку для уточнения информации.'
	      })
	      
	      // Обновляем страницу, чтобы пользователь перешел в профиль
	      if (latestMessage.confirmed) {
	        window.location.reload();
	      }
	    }
	    
	    // Обработка сообщений о подтверждении пользователя (новый формат)
	    else if (latestMessage.type === 'user_confirmation') {
	      setDebugInfo(prev => prev + `✅ Пользователь подтвержден админом (новый формат)\n`);
	      
	      setUserData(prev => ({
	        ...prev,
	        confirmed: latestMessage.confirmed
	      }))
	      
	      showPopup({
	        title: 'Статус обновлен!',
	        message: latestMessage.confirmed
	          ? 'Ваш аккаунт был подтвержден администратором. Теперь вы можете использовать все функции приложения.'
	          : 'Ваш аккаунт был отклонен администратором. Обратитесь в поддержку для уточнения информации.'
	      })
	      
	      // Обновляем страницу, чтобы пользователь перешел в профиль
	      if (latestMessage.confirmed) {
	        window.location.reload();
	      }
	    }
	  }
	}, [messages, userData, showPopup]);

	const handleSendPhone = async () => {
		if (!phoneNumber.trim()) {
			showPopup({ message: 'Введите номер телефона' })
			return
		}

		setIsSending(true)
		setDebugInfo(
			prev => prev + `📱 Отправляем номер телефона: ${phoneNumber}\n`
		)

		const phoneData = {
			user_id: userData.id, // ID из БД
			telegram_id: userData.telegram_id, // Telegram ID
			phone_number: phoneNumber.trim(),
		}

		try {
			const response = await fetch(`${API_URL}/update-phone`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(phoneData),
			})

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(
					`HTTP error! status: ${response.status}, text: ${errorText}`
				)
			}

			const result = await response.json()
			setDebugInfo(
				prev => prev + `✅ Телефон сохранен: ${JSON.stringify(result)}\n`
			)

			// Обновляем данные пользователя после сохранения телефона
			setUserData(prev => ({
				...prev,
				phone_number: phoneNumber.trim(),
			}))

			showPopup({ message: '✅ Номер телефона успешно сохранен!' })
			setPhoneNumber('')
		} catch (error) {
			setDebugInfo(
				prev => prev + `❌ Ошибка отправки телефона: ${error.message}\n`
			)
			showPopup({ message: `❌ Ошибка: ${error.message}` })
		} finally {
			setIsSending(false)
		}
	}

	const handleBackButton = () => {
		const tg = window.Telegram?.WebApp
		if (tg) {
			tg.close()
		}
	}

	const clearDebug = () => {
		setDebugInfo('')
	}

	if (!userData) {
		return (
			<div style={{ padding: '20px', textAlign: 'center' }}>
				<h2>Загрузка данных...</h2>
			</div>
		)
	}

	return (
		<div
			style={{
				padding: '20px',
				fontFamily: 'system-ui, sans-serif',
				backgroundColor: '#f8f9fa',
				minHeight: '100vh',
			}}
		>
			<h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
				📱 Регистрация
			</h1>

			<div
				style={{
					backgroundColor: 'white',
					borderRadius: '12px',
					padding: '20px',
					marginBottom: '20px',
				}}
			>
				<h2 style={{ marginBottom: '15px' }}>👤 Ваши данные (с сервера)</h2>
				<div style={{ lineHeight: '1.6' }}>
					<div>
						<strong>ID в БД:</strong> {userData.id}
					</div>
					<div>
						<strong>Telegram ID:</strong> {userData.telegram_id}
					</div>
					<div>
						<strong>Имя:</strong> {userData.first_name}
					</div>
					{userData.last_name && (
						<div>
							<strong>Фамилия:</strong> {userData.last_name}
						</div>
					)}
					{userData.username && (
						<div>
							<strong>Юзернейм:</strong> @{userData.username}
						</div>
					)}
					{userData.phone_number && (
						<div>
							<strong>Телефон:</strong> {userData.phone_number}
						</div>
					)}
					<div>
						<strong>Статус:</strong>{' '}
						{userData.confirmed ? '✅ Подтвержден' : '⏳ Ожидает подтверждения'}
					</div>
					<div>
						<strong>Админ:</strong> {userData.is_admin ? '✅ Да' : '❌ Нет'}
					</div>
				</div>
			</div>

			{!userData.phone_number && (
				<div
					style={{
						backgroundColor: 'white',
						borderRadius: '12px',
						padding: '20px',
						marginBottom: '20px',
					}}
				>
					<h2 style={{ marginBottom: '15px' }}>📞 Номер телефона</h2>
					<input
						type='tel'
						placeholder='+7 (999) 123-45-67'
						value={phoneNumber}
						onChange={e => setPhoneNumber(e.target.value)}
						style={{
							width: '100%',
							padding: '12px',
							border: '1px solid #ddd',
							borderRadius: '8px',
							fontSize: '16px',
						}}
					/>
					<p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
						Введите номер телефона для завершения регистрации
					</p>
				</div>
			)}

			{/* Дебаг информация */}
			<div
				style={{
					backgroundColor: '#2d3748',
					color: 'white',
					borderRadius: '12px',
					padding: '15px',
					marginBottom: '20px',
					maxHeight: '200px',
					overflowY: 'auto',
					fontSize: '12px',
				}}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						marginBottom: '10px',
					}}
				>
					<h3 style={{ margin: 0, color: '#90cdf4' }}>🔧 Логи:</h3>
					<button
						onClick={clearDebug}
						style={{
							padding: '5px 10px',
							backgroundColor: '#e53e3e',
							color: 'white',
							border: 'none',
							borderRadius: '5px',
						}}
					>
						Очистить
					</button>
				</div>
				<pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
					{debugInfo || 'Готов к работе...'}
				</pre>
			</div>

			<BackButton onClick={handleBackButton} />
			{!userData.phone_number && (
				<MainButton
					text={isSending ? '🔄 Сохраняем...' : '💾 Сохранить телефон'}
					onClick={handleSendPhone}
					disabled={isSending || !phoneNumber.trim()}
				/>
			)}
		</div>
	)
}

export default UserInfo
