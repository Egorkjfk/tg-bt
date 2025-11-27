// ConfirmedUserPage.jsx
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react'
import { BackButton } from '@vkruglikov/react-telegram-web-app'
import { API_URL, API_BASE_URL } from './constants/api'
import UserProfileSection from './UserProfileSection'
import UserChecklistsPage from './UserChecklistsPage'
import { useClientMQTT } from './ClientMQTT'
import UserSalaryPage from './UserSalaryPage';
import Webcam from 'react-webcam';

// Компонент камеры для смен
const ShiftCameraModal = ({ isOpen, onClose, onPhotoTaken, scheduleId, isStart }) => {
  const webcamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]); // Массив для хранения сделанных фото

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: facingMode
  };

  // Функция для открытия файлового проводника с множественным выбором
  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // Разрешаем выбор нескольких файлов
    
    input.onchange = async (event) => {
      const files = Array.from(event.target.files);
      if (files.length > 0) {
        const base64Photos = [];
        
        // Читаем все выбранные файлы
        for (const file of files) {
          const base64Data = await readFileAsBase64(file);
          base64Photos.push(base64Data);
        }
        
        // Передаем все фото разом
        onPhotoTaken(scheduleId, isStart, base64Photos);
        onClose();
      }
    };
    
    input.click();
  };

  // Функция для чтения файла как Base64
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
 };

  const handleTakePhoto = useCallback(() => {
    try {
      const photoData = webcamRef.current.getScreenshot();
      if (photoData) {
        const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
        
        // Добавляем фото в массив, но не закрываем камеру
        setCapturedPhotos(prev => [...prev, base64Data]);
        
        // Показываем уведомление
        setError(`📸 Фото добавлено! Всего фото: ${capturedPhotos.length + 1}`);
        
        // Автоматически скрываем сообщение через 2 секунды
        setTimeout(() => {
          setError(null);
        }, 2000);
      }
    } catch (err) {
      console.error('Ошибка при съемке фото:', err);
      setError('Не удалось сделать фото');
    }
  }, [capturedPhotos.length]);

  // Функция для отправки всех сделанных фото
 const handleSendAllPhotos = () => {
    if (capturedPhotos.length > 0) {
      onPhotoTaken(scheduleId, isStart, capturedPhotos);
      setCapturedPhotos([]); // Очищаем массив фото
      onClose();
    }
  };

 // Функция для отмены и очистки фото
 const handleCancel = () => {
    setCapturedPhotos([]);
    onClose();
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Сбрасываем фото при открытии/закрытии модалки
  useEffect(() => {
    if (isOpen) {
      setCapturedPhotos([]);
      setError(null);
    }
  }, [isOpen]);

  // Если камера не доступна, сразу открываем файловый проводник
  useEffect(() => {
    if (isOpen && cameraError) {
      openFilePicker();
    }
  }, [isOpen, cameraError]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'black',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Шапка камеры */}
      <div style={{
        padding: '15px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1001
      }}>
        <button
          onClick={handleCancel}
          style={{
            color: 'white',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          ✕ Отмена
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {capturedPhotos.length > 0 && (
            <span style={{ fontSize: '14px' }}>
              📷 {capturedPhotos.length}
            </span>
          )}
          <button
            onClick={switchCamera}
            style={{
              color: 'white',
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            🔄 {facingMode === 'environment' ? 'Фронтальная' : 'Основная'}
          </button>
        </div>
      </div>

      {/* Область камеры */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          onUserMediaError={() => {
            setCameraError(true);
            setError('Не удалось получить доступ к камере');
          }}
        />
        
        {/* Рамка для фото */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '280px',
          height: '280px',
          border: '2px solid white',
          borderRadius: '10px',
          pointerEvents: 'none'
        }} />
      </div>

      {/* Сообщение об ошибке */}
      {error && (
        <div style={{
          color: 'white',
          padding: '15px',
          textAlign: 'center',
          backgroundColor: 'rgba(0,0,0,0.8)'
        }}>
          {error}
          {cameraError && (
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={openFilePicker}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                📁 Выбрать файлы
              </button>
            </div>
          )}
        </div>
      )}

      {/* Кнопки управления */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px'
      }}>
        {/* Кнопка съемки */}
        <button
          onClick={handleTakePhoto}
          style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            backgroundColor: 'white',
            border: '4px solid #333',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}
        >
          📸
        </button>

        {/* Кнопка отправки всех фото */}
        {capturedPhotos.length > 0 && (
          <button
            onClick={handleSendAllPhotos}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            ✅ Отправить все фото ({capturedPhotos.length})
          </button>
        )}

        {/* Подсказка */}
        <div style={{ color: 'white', fontSize: '14px', textAlign: 'center' }}>
          {capturedPhotos.length === 0
            ? 'Нажмите для съемки'
            : 'Сделайте еще фото или отправьте все'}
        </div>
      </div>

      {/* Превью сделанных фото */}
      {capturedPhotos.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '150px',
          left: '20px',
          display: 'flex',
          gap: '10px',
          maxWidth: 'calc(100% - 40px)',
          overflowX: 'auto',
          padding: '10px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: '10px'
        }}>
          {capturedPhotos.map((photo, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <img
                src={`data:image/jpeg;base64,${photo}`}
                alt={`Фото ${index + 1}`}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '5px',
                  objectFit: 'cover'
                }}
              />
              <div style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ConfirmedUserPage = ({ userData }) => {
	const [schedules, setSchedules] = useState([])
	const [zones, setZones] = useState([])
	const [currentDate, setCurrentDate] = useState(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [weekOffset, setWeekOffset] = useState(0)
	const [activeTab, setActiveTab] = useState('schedule') // 'schedule' or 'checklists'
	const [updatedUserData, setUpdatedUserData] = useState(userData)
	const [lastChecklistUpdate, setLastChecklistUpdate] = useState(0)
	const [cameraModal, setCameraModal] = useState({
    isOpen: false,
    scheduleId: null,
    isStart: null // true для начала смены, false для окончания
  });
	
	// Получаем контекст MQTT
	const mqttContext = useClientMQTT();
 const { messages } = mqttContext || {};
	
	// Обрабатываем MQTT сообщения для подтвержденного пользователя
	useEffect(() => {
	  if (messages && messages.length > 0) {
	    const lastMessage = messages[messages.length - 1];
	    
	    // Обрабатываем сообщения о подтверждении чек-листов
	    if (lastMessage.type === 'status' && lastMessage.user_id === userData?.id) {
	      console.log('🔄 Получено обновление статуса чек-листа:', lastMessage);
	      
	      // Здесь можно добавить обновление состояния чек-листов, если нужно
	      // Пока просто выводим в консоль и показываем уведомление
	      const tg = window.Telegram?.WebApp;
	      if (tg) {
	        // Используем showPopup вместо showAlert, так как он поддерживается в версии 6.0
	        tg.showPopup({
	          title: 'Статус обновлен',
	          message: `Статус чек-листа #${lastMessage.checklist_id} обновлен: ${lastMessage.confirmed ? 'подтверждено' : 'ожидает подтверждения'}`,
	          buttons: [{ type: 'ok' }]
	        });
	      }
	    }
	    
	    // Обрабатываем сообщения о новых чек-листах для текущей зоны пользователя
	    // Уведомление об этом уже отображается в UserChecklistsPage, чтобы избежать дублирования
	    if (lastMessage.type === 'checklist' && lastMessage.zone_id === mqttContext?.currentZoneId) {
	      console.log('📋 Получен новый чек-лист для зоны пользователя:', lastMessage);
	    }
	    
	    // Обрабатываем сообщения о расписании
	    if (lastMessage.type === 'user_schedules' && lastMessage.schedule?.worker_id === userData?.id) {
	      console.log('📅 Получено обновление расписания:', lastMessage);
	      
	      // Просто добавляем новое расписание к существующему списку
	      setSchedules(prevSchedules => {
	        // Проверяем, есть ли уже такое расписание в списке (по ID)
	        const exists = prevSchedules.some(s => s.id === lastMessage.schedule.id);
	        if (exists) {
	          // Обновляем существующее расписание
	          return prevSchedules.map(s =>
	            s.id === lastMessage.schedule.id ? lastMessage.schedule : s
	          );
	        } else {
	          // Добавляем новое расписание
	          return [...prevSchedules, lastMessage.schedule];
	        }
	      });
	      
	      // Показываем уведомление пользователю через консоль (избегаем модальных окон WebApp)
	      console.log(`📅 Новое расписание на ${getDayName(lastMessage.schedule.date)}: ${formatTime(lastMessage.schedule.planned_start_time)} - ${formatTime(lastMessage.schedule.planned_end_time)}`);
	    }
	  }
	}, [messages, userData?.id, mqttContext?.currentZoneId, weekOffset]);

	// Обработчик открытия камеры для начала смены
	  const handleOpenStartCamera = (scheduleId) => {
	    setCameraModal({
	      isOpen: true,
	      scheduleId: scheduleId,
	      isStart: true
	    });
	  };
	
	  // Обработчик открытия камеры для окончания смены
	  const handleOpenEndCamera = (scheduleId) => {
	    setCameraModal({
	      isOpen: true,
	      scheduleId: scheduleId,
	      isStart: false
	    });
	  };
	
	 // Обработчик фото из камеры
	  const handlePhotoFromCamera = async (scheduleId, isStart, photos) => {
	    try {
	      // Получаем текущее время в формате HH:MM
	      const now = new Date();
	      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
	      
	      // photos - массив base64 строк
	      const combinedPhotoData = photos.join(',');
	      
	      // Выбираем соответствующий эндпоинт
	      const endpoint = isStart ? `${API_URL}/update-actual-start-time` : `${API_URL}/update-actual-end-time`;
	      
	      const response = await fetch(endpoint, {
	        method: 'POST',
	        headers: { 'Content-Type': 'application/json' },
	        body: JSON.stringify({
	          schedule_id: scheduleId,
	          time: time,
	          photo_data: combinedPhotoData,
	          admin_id: userData.id,
	          telegram_id: userData.telegram_id,
	        }),
	      });
	
	      if (!response.ok) {
	        throw new Error(`HTTP error! status: ${response.status}`);
	      }
	
	      const result = await response.json();
	
	      if (result.status === 'success') {
	        // Обновляем локальное состояние
	        setSchedules(prevSchedules =>
	          prevSchedules.map(schedule =>
	            schedule.id === scheduleId
	              ? {
	                  ...schedule,
	                  [isStart ? 'actual_start_time' : 'actual_end_time']: `0000-01-01T${time}:00Z`
	                }
	              : schedule
	          )
	        );
	      } else {
	        throw new Error(result.message || `Ошибка при обновлении ${isStart ? 'времени начала' : 'времени окончания'}`);
	      }
	    } catch (err) {
	      console.error(`❌ Ошибка ${isStart ? 'обновления времени начала' : 'обновления времени окончания'}:`, err);
	      alert(`Ошибка ${isStart ? 'обновления времени начала' : 'обновления времени окончания'}: ` + err.message);
	    }
	 };
	
	  // Обработчик обновления времени начала смены (оставляем для совместимости с Telegram API)
	  const handleUpdateStartTime = async (scheduleId) => {
	    try {
	      // Получаем текущее время в формате HH:MM
	      const now = new Date();
	      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
	      
	      // Пробуем сначала Telegram WebApp API
	      const tg = window.Telegram?.WebApp;
	      if (typeof tg?.openCamera === 'function') {
	        try {
	          const photoData = await new Promise((resolve, reject) => {
	            tg.openCamera({
	              callback: (data) => {
	                if (data) {
	                  resolve(data);
	                } else {
	                  reject(new Error('Фото не было сделано'));
	                }
	              }
	            });
	          });
	          
	          // Отправляем время и фото на сервер
	          const response = await fetch(`${API_URL}/update-actual-start-time`, {
	            method: 'POST',
	            headers: { 'Content-Type': 'application/json' },
	            body: JSON.stringify({
	              schedule_id: scheduleId,
	              time: time,
	              photo_data: photoData, // Добавляем фото
	              admin_id: userData.id,
	              telegram_id: userData.telegram_id,
	            }),
	          });
	          
	          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
	          const result = await response.json();
	          
	          if (result.status === 'success') {
	            // Обновляем локальное состояние
	            setSchedules(prevSchedules =>
	              prevSchedules.map(schedule =>
	                schedule.id === scheduleId
	                  ? { ...schedule, actual_start_time: `0000-01-01T${time}:00Z` }
	                  : schedule
	              )
	            );
	          } else {
	            throw new Error(result.message || 'Ошибка при обновлении времени начала');
	          }
	          return; // Успешно завершаем функцию
	        } catch (error) {
	          console.error('Ошибка при работе с Telegram Camera API:', error);
	        }
	      }
	      
	      // Если Telegram API недоступен, открываем нашу кастомную камеру
	      handleOpenStartCamera(scheduleId);
	    } catch (err) {
	      console.error('❌ Ошибка обновления времени начала:', err);
	      alert('Ошибка при обновлении времени начала: ' + err.message);
	    }
	 };
	
	  // Обработчик обновления времени окончания смены (оставляем для совместимости с Telegram API)
	 const handleUpdateEndTime = async (scheduleId) => {
	    try {
	      // Получаем текущее время в формате HH:MM
	      const now = new Date();
	      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
	      
	      // Пробуем сначала Telegram WebApp API
	      const tg = window.Telegram?.WebApp;
	      if (typeof tg?.openCamera === 'function') {
	        try {
	          const photoData = await new Promise((resolve, reject) => {
	            tg.openCamera({
	              callback: (data) => {
	                if (data) {
	                  resolve(data);
	                } else {
	                  reject(new Error('Фото не было сделано'));
	                }
	              }
	            });
	          });
	          
	          // Отправляем время и фото на сервер
	          const response = await fetch(`${API_URL}/update-actual-end-time`, {
	            method: 'POST',
	            headers: { 'Content-Type': 'application/json' },
	            body: JSON.stringify({
	              schedule_id: scheduleId,
	              time: time,
	              photo_data: photoData, // Добавляем фото
	              admin_id: userData.id,
	              telegram_id: userData.telegram_id,
	            }),
	          });
	          
	          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
	          const result = await response.json();
	          
	          if (result.status === 'success') {
	            // Обновляем локальное состояние
	            setSchedules(prevSchedules =>
	              prevSchedules.map(schedule =>
	                schedule.id === scheduleId
	                  ? { ...schedule, actual_end_time: `000-01-01T${time}:00Z` }
	                  : schedule
	              )
	            );
	          } else {
	            throw new Error(result.message || 'Ошибка при обновлении времени окончания');
	          }
	          return; // Успешно завершаем функцию
	        } catch (error) {
	          console.error('Ошибка при работе с Telegram Camera API:', error);
	        }
	      }
	      
	      // Если Telegram API недоступен, открываем нашу кастомную камеру
	      handleOpenEndCamera(scheduleId);
	    } catch (err) {
	      console.error('❌ Ошибка обновления времени окончания:', err);
	      alert('Ошибка при обновлении времени окончания: ' + err.message);
	    }
	 };

	const handleBackButton = () => {
		const tg = window.Telegram?.WebApp
		if (tg) {
			tg.close()
		}
	}

	// Загрузка расписания
	const fetchSchedule = async () => {
		try {
			setLoading(true)
			setError(null)

			const response = await fetch(`${API_URL}/get-worker-weekly-schedule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					worker_id: userData.id,
					week_offset: weekOffset,
					admin_id: userData.id,
					telegram_id: userData.telegram_id,
				}),
			})

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`)

			const result = await response.json()

			if (result.status === 'success') {
				setSchedules(result.schedules || [])
			} else {
				throw new Error(result.message || 'Ошибка при загрузке расписания')
			}
		} catch (err) {
			console.error('❌ Ошибка загрузки расписания:', err)
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	// Загрузка зон
	const fetchZones = async () => {
		try {
			const response = await fetch(`${API_URL}/get-allZones`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`)

			const result = await response.json()

			if (result.status === 'success') {
				setZones(result.zones || [])
			} else {
				throw new Error(result.message || 'Ошибка при загрузке зон')
			}
		} catch (err) {
			console.error('❌ Ошибка загрузки зон:', err)
	}
	}

	// Навигация по неделям
	const handlePrevWeek = () => setWeekOffset(prev => prev - 1)
	const handleNextWeek = () => setWeekOffset(prev => prev + 1)
	const handleCurrentWeek = () => setWeekOffset(0)

	// Получение названия дня недели
	const getDayName = dateString => {
		// Убираем 'T00:00:00Z' и парсим как локальную дату
		const cleanDate = dateString.split('T')[0]
		const date = new Date(cleanDate + 'T00:00:00')
		const days = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
		return days[date.getDay()]
	}

	// Получение названия месяца
	const getMonthName = dateString => {
		// Убираем 'T00:00:00Z' и парсим как локальную дату
		const cleanDate = dateString.split('T')[0]
		const date = new Date(cleanDate + 'T00:00:00')
		const months = [
			'Янв',
			'Фев',
			'Мар',
			'Апр',
			'Май',
			'Июн',
			'Июл',
			'Авг',
			'Сен',
			'Окт',
			'Ноя',
			'Дек',
		]
		return months[date.getMonth()]
	}

	const formatTime = timeString => {
		if (!timeString) return ''
		// Время приходит как "0000-01-01T09:00:00Z" - берем часть после T и до Z
		const timePart = timeString.split('T')[1] // "09:00:00Z"
		return timePart ? timePart.slice(0, 5) : '' // "09:00"
	}

	// Получение числа дня - исправляем парсинг даты
	const getDayNumber = dateString => {
		// Убираем 'T00:00:00Z' и парсим как локальную дату
		const cleanDate = dateString.split('T')[0]
		const date = new Date(cleanDate + 'T00:00:00')
		return date.getDate() // возвращает число (29, 30, etc)
	}
	// Получение заголовка недели
	const getWeekTitle = () => {
		if (weekOffset === 0) return 'Текущая неделя'
		if (weekOffset === 1) return 'Следующая неделя'
		if (weekOffset === -1) return 'Прошлая неделя'
		return `${weekOffset > 0 ? 'Через' : 'Назад'} ${Math.abs(weekOffset)} ${
			Math.abs(weekOffset) === 1 ? 'неделю' : 'недели'
		}`
	}

	// Получение названия зоны по ID
	const getZoneName = (zoneId) => {
		const zone = zones.find(z => z.id === zoneId);
		return zone ? zone.name : `Зона #${zoneId}`;
	}

	// Получение текущей даты из API
	useEffect(() => {
		const fetchCurrentDate = async () => {
			try {
				const response = await fetch(`${API_URL}/get-current-date`, {
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const result = await response.json();

				if (result.status === 'success') {
					setCurrentDate(result.date);
				} else {
					throw new Error(result.message || 'Ошибка при загрузке текущей даты');
				}
			} catch (err) {
				console.error('❌ Ошибка загрузки текущей даты:', err);
				// Не устанавливаем ошибку, так как это не критично для основной функциональности
			}
		};

		fetchCurrentDate();
	}, []);

	useEffect(() => {
	if (userData) {
			fetchSchedule()
			fetchZones()
	}
	}, [userData, weekOffset])

	// Функция для обновления чек-листов
	const refreshChecklists = () => {
	setLastChecklistUpdate(Date.now())
	}


	if (!userData) {
		return (
			<div style={{ padding: '20px', textAlign: 'center' }}>
				<h2>Загрузка...</h2>
			</div>
		)
	}

	return (
		<div
			style={{
				padding: '0px',
				fontFamily: 'system-ui, sans-serif',
				backgroundColor: '#f8fafc',
				minHeight: '100vh',
				margin: '0',
				width: '100%',
				overflow: 'hidden'
			}}
		>
			<UserProfileSection
				userData={updatedUserData}
				onProfileUpdate={setUpdatedUserData}
				fullWidth={true}
			/>
			
			{/* Переключатель вкладок */}
			<div
				style={{
					display: 'flex',
					gap: '10px',
					marginBottom: '15px',
					padding: '0 15px',
				}}
			>
				<button
					onClick={() => setActiveTab('schedule')}
					style={{
						padding: '10px 20px',
						backgroundColor: activeTab === 'schedule' ? '#4299e1' : '#e2e8f0',
						color: activeTab === 'schedule' ? 'white' : 'black',
						border: 'none',
						borderRadius: '8px',
						cursor: 'pointer',
						flex: 1,
					}}
				>
					📅 Расписание
				</button>
				<button
					onClick={() => setActiveTab('checklists')}
					style={{
						padding: '10px 20px',
						backgroundColor: activeTab === 'checklists' ? '#4299e1' : '#e2e8f0',
						color: activeTab === 'checklists' ? 'white' : 'black',
						border: 'none',
						borderRadius: '8px',
						cursor: 'pointer',
						flex: 1,
					}}
				>
					📋 Чек-листы
				</button>
				 <button
			                 onClick={() => setActiveTab('salary')}
			                 style={{
			                     padding: '10px 15px',
			                     backgroundColor: activeTab === 'salary' ? '#4299e1' : '#e2e8f0',
			                     color: activeTab === 'salary' ? 'white' : 'black',
			                     border: 'none',
			                     borderRadius: '8px',
			                     cursor: 'pointer',
			                     fontSize: '12px',
			                 }}
			             >
			                 💰 Зарплата
			             </button>
			</div>

			{/* Содержимое вкладок */}
			{activeTab === 'schedule' && (
				<div
					style={{
						backgroundColor: 'white',
						borderRadius: '0px',
						padding: '0px',
						boxShadow: 'none',
						margin: '0',
						width: '100%',
						overflow: 'hidden'
					}}
				>
					{/* Заголовок расписания */}
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '20px',
							padding: '0 15px',
						}}
					>
						<h2
							style={{
								margin: 0,
								color: '#1f2937',
								fontSize: '18px',
							}}
						>
							📅 Мое расписание
						</h2>
						<div
							style={{
								fontSize: '12px',
								color: '#6b7280',
								backgroundColor: '#f3f4f6',
								padding: '4px 8px',
								borderRadius: '8px',
							}}
						>
							{getWeekTitle()}
						</div>
					</div>
	
					{/* Навигация по неделям */}
					<div
						style={{
							display: 'flex',
							gap: '8px',
							marginBottom: '20px',
							padding: '0 15px',
						}}
					>
						<button
							onClick={handlePrevWeek}
							style={{
								flex: 1,
								padding: '10px',
								backgroundColor: '#f3f4f6',
								color: '#374151',
								border: 'none',
								borderRadius: '10px',
								cursor: 'pointer',
								fontSize: '14px',
							}}
						>
							⬅️ Назад
						</button>
						<button
							onClick={handleCurrentWeek}
							style={{
								flex: 1,
								padding: '10px',
								backgroundColor: '#3b82f6',
								color: 'white',
								border: 'none',
								borderRadius: '10px',
								cursor: 'pointer',
								fontSize: '14px',
							}}
						>
							Сегодня
						</button>
						<button
							onClick={handleNextWeek}
							style={{
								flex: 1,
								padding: '10px',
								backgroundColor: '#f3f4f6',
								color: '#374151',
								border: 'none',
								borderRadius: '10px',
								cursor: 'pointer',
								fontSize: '14px',
							}}
						>
							Вперёд ➡️
						</button>
					</div>
	
					{/* Содержимое расписания */}
					{loading ? (
						<div
							style={{
								textAlign: 'center',
								padding: '40px',
								color: '#6b7280',
							}}
						>
							<div>🔄 Загрузка расписания...</div>
						</div>
					) : error ? (
						<div
							style={{
								textAlign: 'center',
								padding: '20px',
								color: '#ef4444',
							}}
						>
							<div>❌ {error}</div>
							<button
								onClick={fetchSchedule}
								style={{
									marginTop: '10px',
									padding: '8px 16px',
									backgroundColor: '#3b82f6',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									cursor: 'pointer',
									fontSize: '14px',
								}}
							>
								Повторить
							</button>
						</div>
					) : schedules.length === 0 ? (
						<div
							style={{
								textAlign: 'center',
								padding: '40px',
								color: '#6b7280',
							}}
						>
							<div>📭 Расписание не найдено</div>
							<div style={{ fontSize: '14px', marginTop: '8px' }}>
								На эту неделю у вас нет запланированных смен
							</div>
						</div>
					) : (
						<div style={{ overflowY: 'visible' }}>
							{schedules.map((schedule, index) => (
								<div
									key={schedule.id}
									style={{
										padding: '16px',
										border: '1px solid #e5e7eb',
										borderRadius: '12px',
										marginBottom: '12px',
										backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
										margin: '0 15px 15px',
									}}
								>
									{/* Заголовок дня */}
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											marginBottom: '12px',
										}}
									>
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '8px',
											}}
										>
											<div
												style={{
													padding: '4px 8px',
													backgroundColor: '#3b82f6',
													color: 'white',
													borderRadius: '6px',
													fontSize: '12px',
													fontWeight: 'bold',
												}}
											>
												{getDayName(schedule.date)}
											</div>
											<div style={{ fontSize: '16px', fontWeight: '500' }}>
												{getDayNumber(schedule.date)}{' '}
												{getMonthName(schedule.date)}
											</div>
										</div>
										<div
											style={{
												display: 'flex',
												flexDirection: 'column',
												alignItems: 'center',
												fontSize: '12px',
												color: '#6b7280',
											}}
										>
											<div>{getZoneName(schedule.zone_id)}</div>
											{(() => {
												const zone = zones.find(z => z.id === schedule.zone_id);
												return zone && zone.image_path ? (
													<div style={{ marginTop: '8px', textAlign: 'center' }}>
														<img
															src={`${API_BASE_URL}${zone.image_path}`}
															alt={zone.name}
															style={{
																maxWidth: '100%',
																maxHeight: '60px',
																borderRadius: '6px',
																border: '1px solid #e2e8f0',
																objectFit: 'cover',
															}}
														/>
														<div style={{ fontSize: '10px', marginTop: '2px', color: '#4b5563' }}>
															{zone.name}
														</div>
													</div>
												) : null;
											})()}
										</div>
									</div>

									{/* Время */}
									<div
										style={{
											display: 'grid',
											gridTemplateColumns: '1fr 1fr',
											gap: '12px',
										}}
									>
										{/* Планируемое время */}
										<div>
											<div
												style={{
													fontSize: '12px',
													color: '#6b7280',
													marginBottom: '4px',
												}}
											>
												🕐 План
											</div>
											<div
												style={{
													fontSize: '14px',
													fontWeight: '500',
												}}
											>
												{formatTime(schedule.planned_start_time)} -{' '}
												{formatTime(schedule.planned_end_time)}
											</div>
										</div>

										{/* Фактическое время */}
										<div>
											<div
												style={{
													fontSize: '12px',
													color: '#6b7280',
													marginBottom: '4px',
												}}
											>
												📝 Факт
											</div>
											<div
												style={{
													fontSize: '14px',
													fontWeight: '500',
													color: schedule.actual_start_time
														? '#059669'
														: '#ef4444',
												}}
											>
												{schedule.actual_start_time && schedule.actual_end_time
													? `${formatTime(
															schedule.actual_start_time
													  )} - ${formatTime(schedule.actual_end_time)}`
													: schedule.actual_start_time
													? `${formatTime(schedule.actual_start_time)} - ...`
													: 'Не начато'}
											</div>
										</div>
									</div>

									{/* Кнопки управления сменой */}
									<div
										style={{
											marginTop: '12px',
											display: 'flex',
											gap: '8px',
											justifyContent: 'center',
										}}
									>
										{!schedule.actual_start_time ? (
											<button
												onClick={() => handleUpdateStartTime(schedule.id)}
												style={{
													padding: '8px 16px',
													backgroundColor: currentDate && currentDate === schedule.date.split('T')[0] ? '#3b82f6' : '#9ca3af',
													color: 'white',
													border: 'none',
													borderRadius: '8px',
													cursor: currentDate && currentDate === schedule.date.split('T')[0] ? 'pointer' : 'not-allowed',
													fontSize: '14px',
													fontWeight: '500',
												}}
												disabled={!(currentDate && currentDate === schedule.date.split('T')[0])}
											>
												🚪 Вышел на смену
											</button>
										) : !schedule.actual_end_time ? (
											<button
												onClick={() => handleUpdateEndTime(schedule.id)}
												style={{
													padding: '8px 16px',
													backgroundColor: '#ef4444',
													color: 'white',
													border: 'none',
													borderRadius: '8px',
													cursor: 'pointer',
													fontSize: '14px',
													fontWeight: '500',
												}}
											>
												⏹️ Завершить смену
											</button>
										) : null}
									</div>

									{/* Статус */}
									<div
										style={{
											marginTop: '12px',
											display: 'flex',
											justifyContent: 'center',
										}}
									>
										<span
											style={{
												padding: '4px 12px',
												borderRadius: '12px',
												fontSize: '12px',
												fontWeight: 'bold',
												backgroundColor: schedule.actual_end_time
													? '#10b981'
													: schedule.actual_start_time
													? '#f59e0b'
													: '#ef444',
												color: 'white',
											}}
										>
											{schedule.actual_end_time
												? '✅ Завершено'
												: schedule.actual_start_time
												? '🟡 В работе'
												: '❌ Не начато'}
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{activeTab === 'checklists' && (
				<UserChecklistsPage
					userData={updatedUserData}
					onBack={() => setActiveTab('schedule')}
					lastUpdate={lastChecklistUpdate}
					fullWidth={true}
				/>
			)}
			 {activeTab === 'salary' && (
			                 <UserSalaryPage userData={updatedUserData} fullWidth={true} />
			             )}
			 
			 			{/* Модальное окно камеры для смен */}
			 			<ShiftCameraModal
			         isOpen={cameraModal.isOpen}
			         onClose={() => setCameraModal({ isOpen: false, scheduleId: null, isStart: null })}
			         onPhotoTaken={handlePhotoFromCamera}
			         scheduleId={cameraModal.scheduleId}
			         isStart={cameraModal.isStart}
			       />
			 
			 			<BackButton onClick={handleBackButton} />
			 		</div>
			 	)
			 }

export default ConfirmedUserPage
