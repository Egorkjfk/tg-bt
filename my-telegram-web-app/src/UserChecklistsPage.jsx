import React, { useState, useEffect, useRef, useCallback } from 'react'
import { API_ENDPOINTS, API_URL } from './constants/api'
import { useClientMQTT } from './ClientMQTT'
import Webcam from 'react-webcam';


// Компонент камеры
const CameraModal = ({ isOpen, onClose, onPhotoTaken, checklistId, zoneId }) => {
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
        onPhotoTaken(checklistId, zoneId, base64Photos);
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
      onPhotoTaken(checklistId, zoneId, capturedPhotos);
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
          backgroundColor: 'rgba(0,0,0,0.8)',
          position: 'absolute',
          top: '70px',
          left: 0,
          right: 0,
          zIndex: 1002
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
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1001,
        padding: '0 20px',
        boxSizing: 'border-box'
      }}>
        {/* Кнопка отправки - СЛЕВА (компактная) */}
        {capturedPhotos.length > 0 && (
          <button
            onClick={handleSendAllPhotos}
            style={{
              position: 'absolute',
              left: '20px', // Прижато к левому краю
              bottom: '0',
              padding: '10px 15px', // Уменьшил padding
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '20px', // Сделал менее круглой
              cursor: 'pointer',
              fontSize: '14px', // Уменьшил шрифт
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px', // Уменьшил расстояние между иконкой и текстом
              zIndex: 1002,
              maxWidth: '140px' // Ограничил максимальную ширину
            }}
          >
            <span style={{ fontSize: '16px' }}>✅</span>
            <span>Отправить ({capturedPhotos.length})</span>
          </button>
        )}

        {/* Кнопка съемки - ВСЕГДА ПО ЦЕНТРУ */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
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
              fontSize: '24px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
          >
            📸
          </button>
        </div>
      </div>

      {/* Превью сделанных фото - вертикальный список справа */}
      {capturedPhotos.length > 0 && (
        <div style={{
          position: 'absolute',
          right: '20px',
          bottom: '150px', // Начинаем от кнопок
          display: 'flex',
          flexDirection: 'column-reverse', // Новые фото добавляются сверху
          gap: '10px',
          maxHeight: 'calc(100vh - 300px)', // Ограничиваем высоту
          overflowY: 'auto', // Вертикальная прокрутка если много фото
          padding: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderRadius: '10px',
          zIndex: 1001,
          alignItems: 'flex-end' // Выравнивание по правому краю
        }}>
          {capturedPhotos.map((photo, index) => (
            <div key={index} style={{ 
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <div style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {capturedPhotos.length - index} {/* Обратная нумерация */}
              </div>
              <img
                src={`data:image/jpeg;base64,${photo}`}
                alt={`Фото ${capturedPhotos.length - index}`}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '5px',
                  objectFit: 'cover'
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const UserChecklistsPage = ({ userData, onBack, lastUpdate, fullWidth = false }) => {
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [zones, setZones] = useState([])
  const [shownNotifications, setShownNotifications] = useState(() => {
    const saved = localStorage.getItem('shownNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
    const [cameraModal, setCameraModal] = useState({
    isOpen: false,
    checklistId: null,
    zoneId: null
 });
  
  // Массив для хранения фото для отправки
  const [checklistPhotos, setChecklistPhotos] = useState({});

  useEffect(() => {
    localStorage.setItem('shownNotifications', JSON.stringify([...shownNotifications]));
  }, [shownNotifications]);
  
  // Используем ClientMQTT для получения сообщений
  const clientMQTT = useClientMQTT()
  const { connected, messages: clientMessages, publish } = clientMQTT || {}
  
  // Объединяем сообщения (в данном случае используем только сообщения из ClientMQTT)
  const allMessages = clientMessages || []

  const safeShowAlert = (message) => {
  const tg = window.Telegram?.WebApp;
  if (!tg) {
    console.log('Alert:', message);
    return;
  }
  try {
    // Используем showPopup вместо showAlert
    // if (typeof tg.showPopup === 'function') {
    //   tg.showPopup({
    //     title: 'Уведомление',
    //     message: message,
    //     buttons: [{ type: 'ok' }]
    //   });
    // } else if (typeof tg.showAlert === 'function') {
    //   // Для обратной совместимости
    //   tg.showAlert(message);
    // } else {
    //   console.log('Alert:', message);
    // }
  } catch (error) {
    if (error.message.includes('Popup is already opened')) {
      console.log('⚠️ Popup уже открыт, пропускаем уведомление');
    } else {
      console.log('Alert:', message);
    }
  }
};

  // Функция для обновления конкретного чек-листа
  const updateChecklist = (updatedChecklist) => {
    setChecklists(prev => {
      const exists = prev.find(c => c.id === updatedChecklist.id);
      if (exists) {
        // Обновляем существующий
        return prev.map(c => 
          c.id === updatedChecklist.id ? { ...c, ...updatedChecklist } : c
        );
      } else {
        // Добавляем новый в начало
        return [updatedChecklist, ...prev];
      }
    });
  };

  // Функция для добавления фото к чек-листу
  const addPhotoToChecklist = (checklistId, photoPath) => {
    setChecklists(prev => 
      prev.map(checklist => 
        checklist.id === checklistId 
          ? { ...checklist, photo: photoPath, status: true }
          : checklist
      )
    );
  };

  // Функция для изменения статуса выполнения чек-листа
const toggleChecklistStatus = async (checklistId, currentStatus) => {
  try {
    const response = await fetch(API_ENDPOINTS.UPDATE_CHECKLIST_STATUS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checklist_id: checklistId,
        status: !currentStatus,
        user_id: userData.id,
        telegram_id: userData.telegram_id,
      }),
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const result = await response.json()

    if (result.status === 'success') {
      // Локально обновляем статус
      updateChecklist({
        id: checklistId,
        status: !currentStatus
      });
      
      safeShowAlert(`✅ Статус чек-листа #${checklistId} изменен на ${!currentStatus ? 'выполнен' : 'не выполнен'}`);
    } else {
      throw new Error(result.message || 'Ошибка при изменении статуса')
    }
  } catch (err) {
    console.error('❌ Ошибка изменения статуса чек-листа:', err)
    safeShowAlert('Ошибка при изменении статуса: ' + err.message)
  }
}

  // Получение текущей даты с сервера
  const fetchCurrentDate = async () => {
    if (window.cachedDate && window.cacheExpiry && new Date().getTime() < window.cacheExpiry) {
      return window.cachedDate;
    }
    
    try {
      const response = await fetch(API_ENDPOINTS.GET_CURRENT_DATE);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      window.cachedDate = data.date;
      window.cacheExpiry = new Date().getTime() + 60 * 60 * 1000;
      return data.date;
    } catch (err) {
      console.error('❌ Ошибка получения даты с сервера:', err);
      return new Date().toISOString().split('T')[0];
    }
  };

  // Загрузка чек-листов (только при первом рендере или явном обновлении)
  const fetchChecklists = async () => {
    try {
      setLoading(true)
      setError(null)

      const today = await fetchCurrentDate();
      const response = await fetch(API_ENDPOINTS.GET_WORKER_CHECKLISTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: userData.id,
          date: today,
          telegram_id: userData.telegram_id,
        }),
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()

      if (result.status === 'success') {
        setChecklists(result.checklists || [])
        
        // Обновляем MQTT-подключение, если есть новые чек-листы
        if (result.checklists && result.checklists.length > 0) {
          // Получаем уникальные зоны из чек-листов
          const uniqueZoneIds = [...new Set(result.checklists.map(cl => cl.zone_id))];
          console.log('🔄 Обновление MQTT подключения для новых зон:', uniqueZoneIds);
          
          // В новой архитектуре обновление зон происходит автоматически при изменении userData
          // или при подключении к MQTT, поэтому дополнительных действий не требуется
        }
      } else {
        throw new Error(result.message || 'Ошибка при загрузке чек-листов')
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки чек-листов:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Загрузка зон
  const fetchZones = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.GET_ALL_ZONES, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      if (result.status === 'success') {
        setZones(result.zones || [])
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки зон:', err)
    }
  }

  // ОБНОВЛЕННАЯ ФУНКЦИЯ ДЛЯ ОТКРЫТИЯ КАМЕРЫ
const handleTakePhoto = async (checklistId) => {
  const tg = window.Telegram?.WebApp;
  
  const checklistItem = checklists.find(c => c.id === checklistId);
  if (!checklistItem) {
    safeShowAlert('Чек-лист не найден');
    return;
  }
  const zoneId = checklistItem.zone_id;

  try {
    // Пробуем сначала Telegram WebApp API
    if (typeof tg?.openCamera === 'function') {
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
      await uploadPhoto(checklistId, zoneId, photoData);
      return;
    }

    // Пробуем файловый пикер Telegram
    if (typeof tg?.openFilePicker === 'function') {
      const fileData = await new Promise((resolve, reject) => {
        tg.openFilePicker({
          accept: 'image/*',
          callback: (data) => {
            if (data && data.length > 0) {
              resolve(data[0]);
            } else {
              reject(new Error('Файл не был выбран'));
            }
          }
        });
      });
      await uploadPhoto(checklistId, zoneId, fileData.data);
      return;
    }

    // Если Telegram API недоступны, используем нашу кастомную камеру
    setCameraModal({
      isOpen: true,
      checklistId,
      zoneId
    });

  } catch (error) {
    console.error('Ошибка при работе с камерой:', error);
    // Если Telegram API не сработали, открываем кастомную камеру
    setCameraModal({
      isOpen: true,
      checklistId,
      zoneId
    });
  }
};
// Функция для обработки фото из кастомной камеры
const handlePhotoFromCamera = async (checklistId, zoneId, photoData) => {
  // photoData теперь может быть массивом (несколько фото) или строкой (одно фото)
  const photosArray = Array.isArray(photoData) ? photoData : [photoData];
  await uploadPhoto(checklistId, zoneId, photosArray);
};

// Закрытие камеры
const closeCamera = () => {
  setCameraModal({
    isOpen: false,
    checklistId: null,
    zoneId: null
  });
};

  // Функция для загрузки фото на сервер - ОБНОВЛЕННАЯ
  const uploadPhoto = async (checklistId, zoneId, photos) => {
  try {
    // photos - массив base64 строк
    const combinedPhotoData = photos.join(',');
    
    const response = await fetch(API_ENDPOINTS.ADD_CHECKLIST_PHOTO, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checklist_id: checklistId,
        photo_data: combinedPhotoData,
        worker_id: userData.id,
        telegram_id: userData.telegram_id,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === 'success') {
      fetchChecklists();
      safeShowAlert(`✅ Фото успешно загружены! Всего: ${photos.length}`);
    } else {
      throw new Error(result.message || 'Ошибка при загрузке фото');
    }
  } catch (error) {
    console.error('Ошибка при загрузке фото:', error);
    safeShowAlert('Ошибка при загрузке фото: ' + error.message);
  }
};
  
  // Функция для отправки всех фото на сервер
  const submitAllPhotos = async (checklistId, photos) => {
    try {
      // Объединяем все фото в одну строку с разделителем
      const combinedPhotoData = photos.join(',');
      
      const response = await fetch(API_ENDPOINTS.ADD_CHECKLIST_PHOTO, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checklist_id: checklistId,
          photo_data: combinedPhotoData, // Base64 строки фото, объединенные запятой
          worker_id: userData.id,
          telegram_id: userData.telegram_id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        // Обновляем список чек-листов
        fetchChecklists();
        safeShowAlert(`Фото успешно загружены! Всего: ${photos.length}`);
      } else {
        throw new Error(result.message || 'Ошибка при загрузке фото');
      }
    } catch (error) {
      console.error('Ошибка при загрузке фото:', error);
      safeShowAlert('Ошибка при загрузке фото: ' + error.message);
    }
  };

  useEffect(() => {
    if (userData) {
      fetchChecklists();
      fetchZones();
    }
  }, [userData, lastUpdate]);
  
 // Обрабатываем сообщения MQTT - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
useEffect(() => {
  if (allMessages && allMessages.length > 0) {
    const lastMessage = allMessages[allMessages.length - 1];
    const notificationId = `msg_${lastMessage.type}_${lastMessage.checklist_id}_${Date.now()}`;
    
    if (!shownNotifications.has(notificationId)) {
      setShownNotifications(prev => new Set([...prev, notificationId]));
      
      // Обработка сообщений о новых чек-листах
      if (lastMessage.Subtype === 'checklist_created' && lastMessage.Type === 'checklist') {
        console.log('📥 Получено уведомление о новом чек-листе:', lastMessage);
        
        // Извлекаем данные чек-листа из сообщения
        const checklistData = lastMessage.checklist;
        
        // Создаем объект чек-листа
        const newChecklist = {
          id: checklistData.id,
          zone_id: checklistData.zone_id,
          description: checklistData.description,
          date: checklistData.date,
          issue_time: checklistData.issue_time,
          status: checklistData.status,
          confirmed: checklistData.confirmed,
          photo: checklistData.photo || null
        };
        
        // Добавляем в список
        updateChecklist(newChecklist);
        safeShowAlert(`📋 Новый чек-лист для зоны ${checklistData.zone_id}: ${checklistData.description}`);
      }
      
      // Обработка сообщений о подтверждении чек-листа
      else if (lastMessage.Subtype === 'confirmation_changed' && lastMessage.Type === 'checklist') {
        console.log('📥 Получено уведомление об изменении подтверждения:', lastMessage);
        
        // Извлекаем данные чек-листа из сообщения
        const checklistData = lastMessage.checklist;
        
        // Обновляем статус чек-листа
        updateChecklist({
          id: checklistData.id,
          status: checklistData.status,
          confirmed: checklistData.confirmed
        });
        
        if (checklistData.confirmed) {
          safeShowAlert(`✅ Чек-лист #${checklistData.id} подтвержден администратором`);
        } else if (checklistData.status && !checklistData.confirmed) {
          safeShowAlert(`⏳ Чек-лист #${checklistData.id} выполнен, ожидает подтверждения`);
        }
      }
      
      // Обработка сообщений о загрузке фото
      else if (lastMessage.Subtype === 'photo_uploaded' && lastMessage.Type === 'checklist') {
        console.log('📥 Получено уведомление о новом фото:', lastMessage);
        
        // Извлекаем данные чек-листа из сообщения
        const checklistData = lastMessage.checklist;
        
        // Добавляем фото к чек-листу
        addPhotoToChecklist(checklistData.id, checklistData.photo);
        safeShowAlert(`📸 Добавлено фото к чек-листу #${checklistData.id}`);
      }
      
      // Обработка сообщений о подтверждении пользователя
      else if (lastMessage.type === 'user_confirmation' && lastMessage.user_id === userData?.id) {
        console.log('📥 Получено уведомление о подтверждении пользователя:', lastMessage);
        
        // Обновляем статус подтверждения пользователя
        safeShowAlert(lastMessage.confirmed
          ? 'Ваш аккаунт был подтвержден администратором!'
          : 'Ваш аккаунт был отклонен администратором.');
        
        // Обновляем страницу, чтобы пользователь перешел в профиль
        if (lastMessage.confirmed) {
          window.location.reload();
        }
      }
      
      // Обработка сообщений о фото (альтернативный формат)
      else if (lastMessage.type === 'photo') {
        console.log('📥 Получено уведомление о фото (альтернативный формат):', lastMessage);
        
        // Добавляем фото к чек-листу
        addPhotoToChecklist(lastMessage.checklist_id, lastMessage.photo_path);
        safeShowAlert(`📸 Добавлено фото к чек-листу #${lastMessage.checklist_id}`);
      }
      
      // Обработка сообщений о статусе (альтернативный формат)
      else if (lastMessage.type === 'status') {
        console.log('📥 Получено уведомление о статусе (альтернативный формат):', lastMessage);
        
        // Обновляем статус чек-листа
        updateChecklist({
          id: lastMessage.checklist_id,
          status: lastMessage.status,
          confirmed: lastMessage.confirmed
        });
        
        if (lastMessage.confirmed) {
          safeShowAlert(`✅ Чек-лист #${lastMessage.checklist_id} подтвержден администратором`);
        } else if (lastMessage.status && !lastMessage.confirmed) {
          safeShowAlert(`⏳ Чек-лист #${lastMessage.checklist_id} выполнен, ожидает подтверждения`);
        }
      }

      // Добавь этот блок в обработку MQTT сообщений (в useEffect где обрабатываются сообщения)
      else if (lastMessage.Subtype === 'status_changed' && lastMessage.Type === 'checklist') {
        console.log('📥 Получено уведомление об изменении статуса выполнения:', lastMessage);
        
        // Извлекаем данные чек-листа из сообщения
        const checklistData = lastMessage.checklist;
        
        // Обновляем статус чек-листа
        updateChecklist({
          id: checklistData.id,
          status: checklistData.status,
          confirmed: checklistData.confirmed || false,
          zone_id: checklistData.zone_id,
          description: checklistData.description,
          date: checklistData.date,
          issue_time: checklistData.issue_time,
          photo: checklistData.photo || null
        });
        
        safeShowAlert(`✅ Чек-лист #${checklistData.id} ${checklistData.status ? 'отмечен как выполненный' : 'отмечен как невыполненный'}`);
      }
      
      // Обработка сообщений об изменении описания
      else if (lastMessage.Subtype === 'description_updated' && lastMessage.Type === 'checklist') {
        console.log('📥 Получено уведомление об изменении описания:', lastMessage);
        
        const checklistData = lastMessage.checklist;
        updateChecklist({
          id: checklistData.id,
          description: checklistData.description
        });
        
        safeShowAlert(`✏️ Описание чек-листа #${checklistData.id} обновлено`);
      }

      // Обработка сообщений об удалении
      else if (lastMessage.Subtype === 'deleted' && lastMessage.Type === 'checklist') {
        console.log('📥 Получено уведомление об удалении:', lastMessage);
        
        const checklistData = lastMessage.checklist;
        setChecklists(prev => prev.filter(c => c.id !== checklistData.id));
        
        safeShowAlert(`🗑️ Чек-лист #${checklistData.id} удален`);
      }
    }
  }
}, [allMessages, userData?.id]);

  // Получение названия зоны по ID
  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : `Зона #${zoneId}`;
  }

  return (
    <div style={{ padding: fullWidth ? '0px' : '15px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', margin: '0', width: '100%', overflow: 'hidden' }}>
      {/* Камера модалка */}
      <CameraModal
        isOpen={cameraModal.isOpen}
        onClose={closeCamera}
        onPhotoTaken={handlePhotoFromCamera}
        checklistId={cameraModal.checklistId}
        zoneId={cameraModal.zoneId}
      />
      {/* Чек-листы */}
      <div
        style={{
          backgroundColor: fullWidth ? 'transparent' : 'white',
          borderRadius: fullWidth ? '0px' : '16px',
          padding: fullWidth ? '0px' : '20px',
          boxShadow: fullWidth ? 'none' : '0 2px 8px rgba(0,0,0.08)',
          margin: fullWidth ? '0' : '0',
          width: fullWidth ? '100%' : 'auto',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
            padding: fullWidth ? '0 15px' : '0',
          }}
        >
          {!fullWidth && (
          <button
            onClick={onBack}
            style={{
              padding: '8px 12px',
              backgroundColor: '#718096',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            ◀ Назад
          </button>
          )}
          <h2
            style={{
              margin: 0,
              color: '#1f2937',
              fontSize: '18px',
            }}
          >
            📋 Мои чек-листы
          </h2>
        </div>
  
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280',
            }}
          >
            <div>🔄 Загрузка чек-листов...</div>
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
              onClick={fetchChecklists}
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
        ) : checklists.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280',
            }}
          >
            <div>ostringstream Чек-листы не найдены</div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>
              На сегодня у вас нет чек-листов
            </div>
          </div>
        ) : (
          <div style={{ overflowY: 'visible' }}>
            {checklists.map((checklist, index) => (
              <div
                key={checklist.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                  margin: fullWidth ? '0 15px' : '0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      #{checklist.id} - {checklist.description}
                    </div>
                    <div style={{ fontSize: '12px', color: '#66' }}>
                      📍 {getZoneName(checklist.zone_id)} | 📅{' '}
                      {checklist.date} | 🕒{' '}
                      {new Date(checklist.issue_time).toLocaleTimeString()}
                    </div>
                  </div>
<div
  style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '5px',
  }}
>
  {/* Статусы вверху */}
  <div style={{ display: 'flex', gap: '5px' }}>
    <span
      style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '10px',
        fontWeight: 'bold',
        backgroundColor: checklist.status
          ? '#38a169'
          : '#e53e3e',
        color: 'white',
      }}
    >
      {checklist.status ? '✅ Выполнено' : '❌ Не выполнено'}
    </span>
    
    <span
      style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '10px',
        fontWeight: 'bold',
        backgroundColor: checklist.confirmed
          ? '#4299e1'
          : '#a0aec0',
        color: 'white',
      }}
    >
      {checklist.confirmed ? '☑ Подтверждено' : '⏳ Ожидает'}
    </span>
  </div>
  
  {/* Кнопки в одной строке */}
  <div style={{ 
    display: 'flex', 
    gap: '6px',
    marginTop: '4px'
  }}>
    {/* Кнопка "Сделал" */}
    <button
      onClick={() => toggleChecklistStatus(checklist.id, checklist.status)}
      disabled={loading}
      style={{
        padding: '6px 8px',
        backgroundColor: checklist.status ? '#38a169' : '#e53e3e',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: loading ? 'not-allowed' : 'pointer',
        minWidth: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px'
      }}
      title={checklist.status ? "Отметить как невыполненный" : "Отметить как выполненный"}
    >
      {checklist.status ? '✅' : '❌'}
      <span>{checklist.status ? 'Сделал' : 'Не сделал'}</span>
    </button>
    
    {/* Кнопка "Фото" - всегда показываем, но меняем цвет */}
    <button
      onClick={() => handleTakePhoto(checklist.id)}
      disabled={loading}
      style={{
        padding: '6px 8px',
        backgroundColor: loading ? '#9ca3af' : 
          (!checklist.status ? '#3b82f6' : 
          (checklist.photo ? '#10b981' : '#8b5cf6')),
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: loading ? 'not-allowed' : 'pointer',
        minWidth: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px'
      }}
      title="Сделать или добавить фото"
    >
      {loading ? '⏳' : '📷'}
      <span>Фото</span>
    </button>
  </div>
</div>
                </div>

                {checklist.photo && (
                  <div style={{ marginTop: '8px' }}>
                    {/* Проверяем, есть ли несколько фото (разделенных запятой) */}
                    {checklist.photo.includes(',') ? (
                      // Отображаем несколько фото в горизонтальном списке с возможностью прокрутки
                      <div style={{
                        display: 'flex',
                        gap: '10px',
                        overflowX: 'auto',
                        padding: '5px 0',
                        maxWidth: '100%'
                      }}>
                        {checklist.photo.split(',').map((photo, index) => (
                          <img
                            key={index}
                            src={`${API_URL.replace('/api', '')}${photo.trim()}`}
                            alt={`Фото чек-листа ${index + 1}`}
                            style={{
                              minWidth: '150px',
                              maxWidth: '150px',
                              maxHeight: '150px',
                              borderRadius: '5px',
                              border: '1px solid #e2e8f0',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              console.error('❌ Ошибка загрузки изображения:', photo);
                              e.target.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      // Отображаем одно фото
                      <img
                        src={`${API_URL.replace('/api', '')}${checklist.photo}`}
                        alt='Фото чек-листа'
                        style={{
                          maxWidth: '100%',
                          maxHeight: '150px',
                          borderRadius: '5px',
                          border: '1px solid #e2e8f0',
                        }}
                        onError={(e) => {
                          console.error('❌ Ошибка загрузки изображения:', checklist.photo);
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default UserChecklistsPage