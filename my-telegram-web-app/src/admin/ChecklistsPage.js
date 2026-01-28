import React, { useState, useEffect, useContext } from 'react'
import { API_URL } from '../constants/api'
import { AdminMQTTContext } from '../AdminMQTT'
import PhotoChecklistsPage from '../FotosChecklistPage' 


const ChecklistsPage = ({ userData, zoneId, onBack, onBackToZones, fullWidth = false }) => {
  const [allChecklists, setAllChecklists] = useState([])
  const [filteredChecklists, setFilteredChecklists] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [isImportant, setIsImportant] = useState(false)
  const [shownNotifications, setShownNotifications] = useState(() => {
    const saved = localStorage.getItem('adminShownNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [selectedDate, setSelectedDate] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [photoModal, setPhotoModal] = useState({
    isOpen: false,
    photos: [],
    currentIndex: 0
  });

  const [viewMode, setViewMode] = useState('checklists');

  // Функция для открытия модалки с фотографиями
  const openPhotoModal = (checklist) => {
    if (!checklist.photo) return;
    
    // Преобразуем строку с фото в массив
    const photos = checklist.photo.includes(',') 
      ? checklist.photo.split(',').map(p => p.trim())
      : [checklist.photo];
    
    setPhotoModal({
      isOpen: true,
      photos: photos,
      currentIndex: 0
    });
  };

  // Функция для навигации по фотографиям
  const navigatePhoto = (direction) => {
    setPhotoModal(prev => {
      let newIndex = prev.currentIndex + direction;
      
      // Циклическая навигация
      if (newIndex < 0) newIndex = prev.photos.length - 1;
      if (newIndex >= prev.photos.length) newIndex = 0;
      
      return {
        ...prev,
        currentIndex: newIndex
      };
    });
  };

  // Функция для закрытия модалки
  const closePhotoModal = () => {
    setPhotoModal({
      isOpen: false,
      photos: [],
      currentIndex: 0
    });
  };

  useEffect(() => {
    localStorage.setItem('adminShownNotifications', JSON.stringify([...shownNotifications]));
  }, [shownNotifications]);

  // Добавить в существующий useEffect или создать новый
  useEffect(() => {
    const fetchCurrentDate = async () => {
      try {
        const response = await fetch(`${API_URL}/get-current-date`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        if (result.status === 'success') {
          setCurrentDate(result.date);
          setSelectedDate(result.date);
          // Также установить эту дату в фильтры
          setFilters(prev => ({ ...prev, date: result.date }));
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки текущей даты:', err);
        const today = new Date().toISOString().split('T')[0];
        setCurrentDate(today);
        setSelectedDate(today);
        setFilters(prev => ({ ...prev, date: today }));
      }
    };
    
    fetchCurrentDate();
  }, []);

  // Инициализация фильтров с учетом zoneId из пропсов
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    status: '',
    confirmed: '',
    zone_id: zoneId || '',
  })

  const mqttContext = useContext(AdminMQTTContext)
  const { connected, messages, publishToUser } = mqttContext || {}

  const safeShowAlert = (message) => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      console.log('Alert:', message);
      return;
    }
    try {
      // Используем showPopup вместо showAlert
      if (typeof tg.showPopup === 'function') {
        tg.showPopup({
          title: 'Уведомление',
          message: message,
          buttons: [{ type: 'ok' }]
        });
      } else if (typeof tg.showAlert === 'function') {
        // Для обратной совместимости
        tg.showAlert(message);
      } else {
        console.log('Alert:', message);
      }
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
    setAllChecklists(prev => {
      const exists = prev.find(c => c.id === updatedChecklist.id);
      if (exists) {
        return prev.map(c => 
          c.id === updatedChecklist.id ? { ...c, ...updatedChecklist } : c
        );
      } else {
        return [updatedChecklist, ...prev];
      }
    });
  };

  // Функция для добавления фото
  const addPhotoToChecklist = (checklistId, photoPath) => {
    setAllChecklists(prev => 
      prev.map(checklist => 
        checklist.id === checklistId 
          ? { ...checklist, photo: photoPath, status: true }
          : checklist
      )
    );
  };

  // Функция для обновления описания чек-листа
  const updateChecklistDescription = async (checklistId, currentDescription) => {
    const newDescription = prompt('Введите новое описание чек-листа:', currentDescription);
    
    if (!newDescription || newDescription.trim() === '') {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/update-checklist-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_id: checklistId,
          description: newDescription.trim(),
          admin_id: userData.id,
          telegram_id: userData.telegram_id,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();

      if (result.status === 'success') {
        // Локально обновляем описание
        updateChecklist({
          id: checklistId,
          description: newDescription.trim()
        });
        
        safeShowAlert(`✅ Описание чек-листа #${checklistId} обновлено`);
      } else {
        throw new Error(result.message || 'Ошибка при обновлении описания');
      }
    } catch (err) {
      console.error('❌ Ошибка обновления описания чек-листа:', err);
      safeShowAlert('Ошибка при обновлении описания: ' + err.message);
    }
  };

  // Добавьте состояние для кастомной модалки подтверждения
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    checklistId: null,
    description: ''
  });

  // Обновленная функция удаления
  const deleteChecklist = (checklistId, description) => {
    setDeleteModal({
      isOpen: true,
      checklistId,
      description
    });
  };

  // Функция подтверждения удаления
  const confirmDelete = () => {
    if (deleteModal.checklistId) {
      performChecklistDelete(deleteModal.checklistId);
    }
    setDeleteModal({ isOpen: false, checklistId: null, description: '' });
  };

  // Функция отмены удаления
  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, checklistId: null, description: '' });
  };

  // И добавьте эту функцию для выполнения удаления (она должна быть после confirmDelete):
  const performChecklistDelete = async (checklistId) => {
    try {
      const response = await fetch(`${API_URL}/delete-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_id: checklistId,
          admin_id: userData.id,
          telegram_id: userData.telegram_id,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();

      if (result.status === 'success') {
        // Удаляем чек-лист из локального состояния
        setAllChecklists(prev => prev.filter(c => c.id !== checklistId));
        safeShowAlert(`🗑️ Чек-лист #${checklistId} удален`);
      } else {
        throw new Error(result.message || 'Ошибка при удалении чек-листа');
      }
    } catch (err) {
      console.error('❌ Ошибка удаления чек-листа:', err);
      safeShowAlert('Ошибка при удалении чек-листа: ' + err.message);
    }
  };

  // Загрузка всех зон
  const fetchZones = async () => {
    try {
      const response = await fetch(`${API_URL}/get-allZones`, {
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

  // Загрузка чек-листов с сервера - ТОЛЬКО по дате
  const fetchChecklists = async () => {
    try {
      setLoading(true)
      const requestData = {
        date: filters.date,
        admin_id: userData.id,
        telegram_id: userData.telegram_id,
      }

      // Добавляем zone_id в запрос только если он указан
      if (filters.zone_id) {
        requestData.zone_id = parseInt(filters.zone_id);
      }

      console.log('📤 Запрос чек-листов с параметрами:', requestData);

      const response = await fetch(`${API_URL}/get-checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()

      if (result.status === 'success') {
        console.log('✅ Получены чек-листы:', result.checklists?.length || 0);
        setAllChecklists(result.checklists || [])
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

  // Локальная фильтрация - ИСПРАВЛЕННАЯ ВЕРСИЯ
  const applyFiltersLocally = (checklistsToFilter = allChecklists) => {
    let filtered = [...checklistsToFilter]

    console.log('🔍 Применение локальных фильтров:', {
      всего: filtered.length,
      фильтры: filters
    });

    // Фильтр по зоне (если указана конкретная зона)
    if (filters.zone_id) {
      filtered = filtered.filter(checklist => checklist.zone_id === parseInt(filters.zone_id))
      console.log('📍 После фильтра по зоне:', filtered.length);
    }

    // Фильтр по статусу выполнения
    if (filters.status !== '') {
      const statusBool = filters.status === 'true'
      filtered = filtered.filter(checklist => checklist.status === statusBool)
      console.log('🔧 После фильтра по статусу:', filtered.length);
    }

    // Фильтр по подтверждению
    if (filters.confirmed !== '') {
      const confirmedBool = filters.confirmed === 'true'
      filtered = filtered.filter(checklist => checklist.confirmed === confirmedBool)
      console.log('✅ После фильтра по подтверждению:', filtered.length);
    }

    console.log('🎯 Итоговое количество после фильтрации:', filtered.length);
    setFilteredChecklists(filtered)
  }

  // Переключение статуса подтверждения - ОБНОВЛЕННАЯ ФУНКЦИЯ
  const toggleChecklistConfirmed = async (checklistId, currentConfirmed) => {
    // ПРОВЕРКА: Нельзя подтвердить невыполненный чек-лист
    const checklist = allChecklists.find(c => c.id === checklistId);
    if (!checklist || !checklist.status) {
      safeShowAlert('❌ Нельзя подтвердить невыполненный чек-лист! Сначала пользователь должен загрузить фото.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/update-checklist-confirmed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_id: checklistId,
          confirmed: !currentConfirmed,
          admin_id: userData.id,
          telegram_id: userData.telegram_id,
        }),
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()

      if (result.status === 'success') {
        // Локально обновляем статус
        updateChecklist({
          id: checklistId,
          confirmed: !currentConfirmed
        });

        safeShowAlert(`✅ Чек-лист #${checklistId} ${!currentConfirmed ? 'подтвержден' : 'снят с подтверждения'}`);
      } else {
        throw new Error(result.message || 'Ошибка при обновлении подтверждения')
      }
    } catch (err) {
      console.error('❌ Ошибка обновления подтверждения чек-листа:', err)
      safeShowAlert('Ошибка при обновлении подтверждения: ' + err.message)
    }
  }

  // Создание нового чек-листа
  const createChecklist = async (important = false) => {
    if (!newDescription.trim()) {
      safeShowAlert('Введите описание чек-листа')
      return
    }

    if (!filters.zone_id && !zoneId) {
      safeShowAlert('Выберите зону для чек-листа')
      return
    }

    try {
      setCreating(true)
      const requestBody = {
        zone_id: parseInt(filters.zone_id || zoneId),
        description: newDescription,
        admin_id: userData.id,
        telegram_id: userData.telegram_id,
        important: important,
      };

      // Добавляем дату только если она отличается от текущей
      if (selectedDate && selectedDate !== currentDate) {
        requestBody.date = selectedDate;
      }

      const response = await fetch(`${API_URL}/create-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()

      if (result.status === 'success') {
        setNewDescription('')
        setShowCreateForm(false)
        // Сбросить выбранную дату на текущую
        setSelectedDate(currentDate);
        // После создания перезагружаем список
        fetchChecklists()
        safeShowAlert('Чек-лист успешно создан!')
      } else {
        throw new Error(result.message || 'Ошибка при создании чек-листа')
      }
    } catch (err) {
      console.error('❌ Ошибка создания чек-листа:', err)
      safeShowAlert('Ошибка при создании чек-листа: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  // Обработчики фильтров
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    console.log(`🔄 Изменение фильтра ${key}:`, value);
    setFilters(newFilters)
  }

  const resetFilters = () => {
    const defaultFilters = {
      date: new Date().toISOString().split('T')[0],
      status: '',
      confirmed: '',
      zone_id: zoneId || '',
    }
    console.log('🔄 Сброс фильтров к значениям по умолчанию');
    setFilters(defaultFilters)
  }

  const getZoneName = zoneId => {
    const zone = zones.find(z => z.id === zoneId)
    return zone ? zone.name : `Зона #${zoneId}`
  }

  // Обрабатываем сообщения MQTT - ОБНОВЛЕННАЯ ВЕРСИЯ
  useEffect(() => {
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const notificationId = `admin_${lastMessage.type || lastMessage.Type}_${lastMessage.checklist_id || (lastMessage.checklist && lastMessage.checklist.id)}_${Date.now()}`;
      
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
            photo: checklistData.photo || null,
            worker_id: checklistData.admin_id // ID администратора, создавшего чек-лист
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
            safeShowAlert(`✅ Чек-лист #${checklistData.id} подтвержден`);
          } else if (checklistData.status && !checklistData.confirmed) {
            safeShowAlert(`⏳ Чек-лист #${checklistData.id} выполнен, ожидает подтверждения`);
          }
        }
        
        // Обработка сообщений о загрузке фото
        else if (lastMessage.Subtype === 'photo_uploaded' && lastMessage.Type === 'checklist') {
          console.log('📥 Получено уведомление о новом фото:', lastMessage);
          
          // Извлекаем данные чек-листа из сообщения
          const checklistData = lastMessage.checklist;
          
          // Обновляем фото и статус чек-листа
          updateChecklist({
            id: checklistData.id,
            photo: checklistData.photo,
            status: checklistData.status, // Устанавливаем статус выполнения
            worker_id: checklistData.admin_id // Сохраняем ID пользователя
          });
          
          // Применяем фильтры локально, чтобы обновить отображение
          applyFiltersLocally();
          
          safeShowAlert(`📸 Пользователь загрузил фото для чек-листа #${checklistData.id}`);
        }

        // Обработка сообщений об изменении статуса выполнения
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
            photo: checklistData.photo || null,
            important: checklistData.important || false
          });
          
          // Применяем фильтры локально, чтобы обновить отображение
          applyFiltersLocally();
          
          if (checklistData.status) {
            safeShowAlert(`✅ Чек-лист #${checklistData.id} отмечен как выполненный`);
          } else {
            safeShowAlert(`❌ Чек-лист #${checklistData.id} отмечен как невыполненный`);
          }
        }

        
        // Обработка сообщений о фото (альтернативный формат)
        else if (lastMessage.type === 'photo') {
          console.log('📥 Получено уведомление о фото (альтернативный формат):', lastMessage);
          
          // Обновляем фото и статус чек-листа
          updateChecklist({
            id: lastMessage.checklist_id,
            photo: lastMessage.photo_path,
            status: true, // Устанавливаем статус выполнен при загрузке фото
            worker_id: lastMessage.worker_id // Сохраняем ID пользователя
          });
          
          // Применяем фильтры локально, чтобы обновить отображение
          applyFiltersLocally();
          
          safeShowAlert(`📸 Пользователь загрузил фото для чек-листа #${lastMessage.checklist_id}`);
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
          setAllChecklists(prev => prev.filter(c => c.id !== checklistData.id));
          
          safeShowAlert(`🗑️ Чек-лист #${checklistData.id} удален`);
        }

        // Обработка старого формата сообщений
        else if (lastMessage.type === 'checklist') {
          console.log('📥 Получен новый чек-лист (старый формат):', lastMessage);
          
          const newChecklist = {
            id: lastMessage.checklist_id,
            zone_id: lastMessage.zone_id,
            description: lastMessage.description,
            date: lastMessage.date,
            issue_time: lastMessage.issue_time,
            status: lastMessage.status || false,
            confirmed: lastMessage.confirmed || false,
            photo: lastMessage.photo || null,
            worker_id: lastMessage.worker_id // ДОБАВЛЕНО
          };
          
          updateChecklist(newChecklist);
        }
      }
    }
  }, [messages]);

  // Загрузка зон при монтировании
  useEffect(() => {
    fetchZones()
  }, [])

  // Загрузка чек-листов при изменении даты или зоны
  useEffect(() => {
    console.log('🔄 Загрузка чек-листов из-за изменения даты или зоны');
    fetchChecklists();
  }, [filters.date, filters.zone_id])

  // Локальная фильтрация при изменении фильтров или данных
  useEffect(() => {
    console.log('🔍 Применение локальной фильтрации');
    applyFiltersLocally();
  }, [filters.status, filters.confirmed, allChecklists])

  // При изменении zoneId из пропсов обновляем фильтр
  useEffect(() => {
    if (zoneId && zoneId !== filters.zone_id) {
      console.log('📍 Обновление фильтра зоны из пропсов:', zoneId);
      setFilters(prev => ({ ...prev, zone_id: zoneId }));
    }
  }, [zoneId])

  // Если выбраны фото чек-листы - показываем PhotoChecklistsPage
  if (viewMode === 'photos') {
    return (
      <div style={{
        padding: '15px',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
      }}>
        {/* Кнопка назад к обычным чек-листам */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={() => setViewMode('checklists')}
            style={{
              padding: '10px 15px',
              backgroundColor: '#718096',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginRight: '10px',
              fontSize: '14px'
            }}
          >
            ◀ Назад к чек-листам
          </button>
          <h2 style={{ margin: 0, color: '#2d3748' }}>
            📸 Все фото чек-листов
          </h2>
        </div>
        
        {/* Отображаем компонент PhotoChecklistsPage прямо здесь */}
        <PhotoChecklistsPage userData={userData} />
      </div>
    )
  }

  // Иначе показываем обычные чек-листы
  return (
    <div
      style={{
        padding: '15px',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
      }}
    >
      {/* Шапка */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0px',
          padding: '0px',
          marginBottom: '0px',
          boxShadow: 'none',
          margin: '0',
          width: '100%',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '15px',
          }}
        >
          <button
            onClick={onBackToZones || onBack}
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
          <h2 style={{ margin: 0, flex: 1 }}>
            📋 Чек-листы {zoneId ? `зоны #${zoneId}` : 'всех зон'}
          </h2>

          {/* ИСПРАВЛЕННАЯ КНОПКА - переключаем viewMode */}
          <button
            onClick={() => setViewMode('photos')}
            style={{
              padding: '10px 15px',
              backgroundColor: '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              margin: '10px'
            }}
          >
            📸 Все фото чек-листов
          </button>

          <button
            onClick={() => {
              setShowCreateForm(true);
              setIsImportant(false); // Сбросить значение чекбокса при открытии формы
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ➕ Новый
          </button>
        </div>

        {/* Фильтры */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginBottom: '15px',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              📅 Дата
            </label>
            <input
              type='date'
              value={filters.date}
              onChange={e => handleFilterChange('date', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              📍 Зона
            </label>
            <select
              value={filters.zone_id}
              onChange={e => handleFilterChange('zone_id', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white',
              }}
            >
              <option value=''>Все зоны</option>
              {zones.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} (#{zone.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              🔧 Статус
            </label>
            <select
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white',
              }}
            >
              <option value=''>Все статусы</option>
              <option value='true'>Выполнено</option>
              <option value='false'>Не выполнено</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              ✅ Подтверждено
            </label>
            <select
              value={filters.confirmed}
              onChange={e => handleFilterChange('confirmed', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white',
              }}
            >
              <option value=''>Все</option>
              <option value='true'>Да</option>
              <option value='false'>Нет</option>
            </select>
          </div>
        </div>

        {/* Кнопка сброса фильтров */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={resetFilters}
            style={{
              padding: '10px 20px',
              backgroundColor: '#a0aec0',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              flex: 1,
              fontSize: '14px',
            }}
          >
            🔄 Сбросить фильтры
          </button>
        </div>
      </div>

      {/* Список чек-листов */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: fullWidth ? '0px' : '12px',
          padding: fullWidth ? '0px' : '15px',
          boxShadow: fullWidth ? 'none' : '0 2px 4px rgba(0,0,0.0.1)',
          margin: fullWidth ? '0' : '0',
          width: fullWidth ? '100%' : 'auto',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
            Загрузка чек-листов...
          </p>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <h3 style={{ color: '#e53e3e' }}>❌ Ошибка</h3>
            <p>{error}</p>
            <button
              onClick={fetchChecklists}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Повторить
            </button>
          </div>
        ) : filteredChecklists.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
            {allChecklists.length === 0
              ? 'Чек-листы не найдены'
              : 'Чек-листы не найдены по выбранным фильтрам'}
          </p>
        ) : (
          <div>
            <div
              style={{
                marginBottom: '15px',
                fontSize: '14px',
                color: '#666',
                textAlign: 'center',
              }}
            >
              Показано {filteredChecklists.length} из {allChecklists.length}{' '}
              чек-листов
            </div>
            <div style={{ overflowY: 'visible' }}>
              {filteredChecklists.map((checklist, index) => (
                <div
                  key={checklist.id}
                  style={{
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    backgroundColor: index % 2 === 0 ? '#f7fafc' : 'white',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                        #{checklist.id} - {checklist.description}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        📍 {getZoneName(checklist.zone_id)} | 📅{' '}
                        {checklist.date} | 🕒{' '}
                        {new Date(checklist.issue_time).toLocaleTimeString()}
                        {checklist.worker_id && ` | 👤 User: ${checklist.worker_id}`}
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
                      
                      {/* ОБНОВЛЕННАЯ КНОПКА ПОДТВЕРЖДЕНИЯ */}
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          backgroundColor: checklist.confirmed 
                            ? '#4299e1' 
                            : checklist.status 
                              ? '#38a169' 
                              : '#a0aec0',
                          color: 'white',
                          cursor: checklist.status ? 'pointer' : 'not-allowed',
                          opacity: checklist.status ? 1 : 0.5,
                        }}
                        onClick={checklist.status ? () => toggleChecklistConfirmed(checklist.id, checklist.confirmed) : undefined}
                        title={checklist.status ? "Нажмите для изменения статуса" : "Сначала нужно выполнить чек-лист"}
                      >
                        {checklist.confirmed ? '☑ Подтверждено' : checklist.status ? '✅ Подтвердить' : '⏳ Ожидает выполнения'}
                      </span>
                      <div
                        style={{
                          display: 'flex',
                          gap: '5px',
                          marginTop: '8px',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          onClick={() => updateChecklistDescription(checklist.id, checklist.description)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#4299e1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                          title="Редактировать описание"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteChecklist(checklist.id, checklist.description)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#e53e3e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '10px',
                          }}
                          title="Удалить чек-лист"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>

                  {checklist.photo && (
                    <div style={{ marginTop: '8px' }}>
                      {/* Проверяем, есть ли несколько фото (разделенных запятой) */}
                      {checklist.photo.includes(',') ? (
                        <div style={{
                          display: 'flex',
                          gap: '10px',
                          overflowX: 'auto',
                          padding: '5px 0',
                          maxWidth: '100%'
                        }}>
                          {checklist.photo.split(',').map((photo, index) => (
                            <div key={index} style={{ position: 'relative' }}>
                              <img
                                src={`${API_URL.replace('/api', '')}${photo.trim()}`}
                                alt={`Фото чек-листа ${index + 1}`}
                                style={{
                                  width: '80px',
                                  height: '80px',
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0',
                                  objectFit: 'cover',
                                  cursor: 'pointer',
                                }}
                                onClick={() => {
                                  openPhotoModal(checklist);
                                  // Устанавливаем текущий индекс
                                  setPhotoModal(prev => ({
                                    ...prev,
                                    currentIndex: index
                                  }));
                                }}
                                onError={(e) => {
                                  console.error('❌ Ошибка загрузки изображения:', photo);
                                  e.target.style.display = 'none';
                                }}
                              />
                              {/* Иконка галереи для множественных фото */}
                              {checklist.photo.split(',').length > 1 && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: '4px',
                                    right: '4px',
                                    backgroundColor: 'rgba(0,0,0,0.7)',
                                    color: 'white',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  {index + 1}/{checklist.photo.split(',').length}
                                </div>
                              )}
                            </div>
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
                            cursor: 'pointer',
                          }}
                          onClick={() => openPhotoModal(checklist)}
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
          </div>
        )}
      </div>

      {/* Модальное окно для просмотра фотографий */}
      {photoModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={closePhotoModal}
        >
          {/* Кнопка закрытия */}
          <button
            onClick={closePhotoModal}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2001,
            }}
          >
            ✕
          </button>

          {/* Счетчик фотографий */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: '8px 12px',
              borderRadius: '20px',
              zIndex: 2001,
            }}
          >
            {photoModal.currentIndex + 1} / {photoModal.photos.length}
          </div>

          {/* Контейнер для фото */}
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Фото */}
            <img
              src={`${API_URL.replace('/api', '')}${photoModal.photos[photoModal.currentIndex]}`}
              alt={`Фото ${photoModal.currentIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '90%',
                objectFit: 'contain',
              }}
              onError={(e) => {
                console.error('❌ Ошибка загрузки изображения:', photoModal.photos[photoModal.currentIndex]);
                e.target.style.display = 'none';
              }}
            />

            {/* Кнопки навигации (только если больше 1 фото) */}
            {photoModal.photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigatePhoto(-1);
                  }}
                  style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    fontSize: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ◀
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigatePhoto(1);
                  }}
                  style={{
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    fontSize: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ▶
                </button>
              </>
            )}
          </div>

          {/* Миниатюры внизу (если больше 1 фото) */}
          {photoModal.photos.length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '0',
                right: '0',
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                padding: '10px',
                overflowX: 'auto',
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 2001,
              }}
            >
              {photoModal.photos.map((photo, index) => (
                <div
                  key={index}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: index === photoModal.currentIndex ? '3px solid #4299e1' : '1px solid #ccc',
                    opacity: index === photoModal.currentIndex ? 1 : 0.7,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoModal(prev => ({ ...prev, currentIndex: index }));
                  }}
                >
                  <img
                    src={`${API_URL.replace('/api', '')}${photo.trim()}`}
                    alt={`Миниатюра ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Кастомная модалка подтверждения удаления */}
      {deleteModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '400px',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#e53e3e' }}>
              🗑️ Подтверждение удаления
            </h3>
            <p style={{ marginBottom: '20px' }}>
              Вы уверены, что хотите удалить чек-лист?
            </p>
            <p style={{ 
              marginBottom: '20px', 
              padding: '10px', 
              backgroundColor: '#f7fafc', 
              borderRadius: '6px',
              fontStyle: 'italic'
            }}>
              "{deleteModal.description}"
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={cancelDelete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#a0aec0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e53e3e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания чек-листа */}
      {showCreateForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '400px',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
              ➕ Создать чек-лист
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                }}
              >
                Зона:
              </label>
              <select
                value={filters.zone_id || zoneId || ''}
                onChange={e => handleFilterChange('zone_id', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  marginBottom: '10px',
                }}
              >
                <option value=''>Выберите зону</option>
                {zones.map(zone => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} (#{zone.id})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                }}
              >
                📅 Дата чек-листа:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              {selectedDate !== currentDate && (
                <button
                  onClick={() => setSelectedDate(currentDate)}
                  style={{
                    marginTop: '5px',
                    padding: '5px 10px',
                    backgroundColor: '#a0aec0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ↺ Сбросить на сегодня
                </button>
              )}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                }}
              >
                Описание:
              </label>
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder='Введите описание чек-листа...'
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  minHeight: '100px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="importantCheckbox"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <label htmlFor="importantCheckbox" style={{ margin: 0, fontSize: '14px' }}>
                  Важный чек-лист
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => createChecklist(isImportant)}
                  disabled={creating || !filters.zone_id}
                  style={{
                    padding: '10px 20px',
                    backgroundColor:
                      creating || !filters.zone_id ? '#ccc' : '#38a169',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor:
                      creating || !filters.zone_id ? 'not-allowed' : 'pointer',
                    flex: 1,
                    fontSize: '14px',
                  }}
                >
                  {creating ? '📤 Создание...' : '💾 Создать'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setIsImportant(false); // Сбросить значение чекбокса при закрытии формы
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#e53e3e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    flex: 1,
                    fontSize: '14px',
                  }}
                >
                  ❌ Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChecklistsPage