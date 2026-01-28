import React, { useState, useEffect } from 'react'
import { API_URL } from './constants/api'

const PhotoChecklistsPage = ({ userData }) => {
  const [checklists, setChecklists] = useState([])
  const [filteredChecklists, setFilteredChecklists] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedChecklists, setSelectedChecklists] = useState(new Set())
  
  // Фильтры
const [filters, setFilters] = useState({
  dateSort: 'desc', // desc - новые сначала, asc - старые сначала
  showOnlyImportant: true,
  showOnlyNormal: false, // ← ДОБАВИТЬ ЭТУ СТРОКУ
  zoneId: '',
  selectAll: false // ← ДОБАВИТЬ ДЛЯ ГАЛОЧКИ "ВЫБРАТЬ ВСЕ"
})
  
  useEffect(() => {
    if (!userData || !userData.id || !userData.telegram_id) {
      console.error('❌ Ошибка: userData не передан или не содержит необходимые поля')
    }
  }, [userData])

// Выбор/снятие одного чек-листа
const toggleChecklistSelection = (checklistId) => {
  setSelectedChecklists(prev => {
    const newSet = new Set(prev)
    if (newSet.has(checklistId)) {
      newSet.delete(checklistId)
    } else {
      newSet.add(checklistId)
    }
    return newSet
  })
}

// Выбрать все в текущем фильтре
const selectAllInFilter = () => {
  const allIds = filteredChecklists.map(c => c.id)
  setSelectedChecklists(new Set(allIds))
  // Обновляем фильтр "выбрать все"
  setFilters(prev => ({ ...prev, selectAll: true }))
}

// Снять все выделения
const clearAllSelections = () => {
  setSelectedChecklists(new Set())
  setFilters(prev => ({ ...prev, selectAll: false }))
}

// При изменении фильтров сбрасываем "выбрать все"
useEffect(() => {
  setFilters(prev => ({ ...prev, selectAll: false }))
}, [filters.dateSort, filters.zoneId, filters.showOnlyImportant, filters.showOnlyNormal])



  // Модалка для фото
  const [photoModal, setPhotoModal] = useState({
    isOpen: false,
    photos: [],
    currentIndex: 0
  })

  // Загрузка зон
  const fetchZones = async () => {
    try {
      const response = await fetch(`${API_URL}/get-allZones`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      if (result.status === 'success') {
        setZones(result.zones || [])
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки зон:', err)
    }
  }

  // Загрузка чек-листов с фото
  const fetchChecklistsWithPhotos = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/get-all-checklist-photos`)
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      
      if (result.status === 'success') {
        console.log('✅ Получено чек-листов с фото:', result.count)
        setChecklists(result.checklists || [])
        applyFilters(result.checklists || [])
      } else {
        throw new Error(result.message || 'Ошибка при загрузке чек-листов')
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки чек-листов с фото:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Применение фильтров
 const applyFilters = (checklistsToFilter = checklists) => {
  let filtered = [...checklistsToFilter]
  
  // Фильтр по важности - ЕСЛИ ВЫБРАНЫ ОБА ИЛИ НИ ОДНОГО - ПОКАЗЫВАЕМ ВСЕ
  if (filters.showOnlyImportant && !filters.showOnlyNormal) {
    // Только важные
    filtered = filtered.filter(checklist => checklist.important === true)
  } else if (!filters.showOnlyImportant && filters.showOnlyNormal) {
    // Только обычные
    filtered = filtered.filter(checklist => checklist.important === false)
  }
  // Если выбраны оба или ни одного - показываем все (не фильтруем по important)
  
  // Фильтр по зоне
  if (filters.zoneId) {
    filtered = filtered.filter(checklist => 
      checklist.zone_id === parseInt(filters.zoneId)
    )
  }
  
  // Сортировка по дате
  filtered.sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    
    if (filters.dateSort === 'desc') {
      return dateB - dateA // Новые сначала
    } else {
      return dateA - dateB // Старые сначала
    }
  })
  
  setFilteredChecklists(filtered)
}

// Функция для массового удаления выбранных чек-листов
// Функция для массового удаления выбранных чек-листов
const deleteSelectedChecklists = async () => {
  if (selectedChecklists.size === 0) {
    alert('❌ Не выбрано ни одного чек-листа для удаления')
    return
  }
  
  if (!userData || !userData.id || !userData.telegram_id) {
    alert('❌ Ошибка: данные пользователя не доступны')
    return
  }
  
  // eslint-disable-next-line no-restricted-globals
  const confirmDelete = confirm(`Вы уверены, что хотите удалить ${selectedChecklists.size} выбранных чек-листов?`)
  if (!confirmDelete) return
  
  try {
    // Преобразуем Set в массив
    const checklistIds = Array.from(selectedChecklists)
    
    console.log('🗑️ Отправка запроса на удаление чек-листов:', checklistIds)
    console.log('👤 Данные админа:', { 
      admin_id: userData.id, 
      telegram_id: userData.telegram_id,
      username: userData.username 
    })
    
    const response = await fetch(`${API_URL}/delete-checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checklist_ids: checklistIds,
        admin_id: userData.id, // ← ИСПОЛЬЗУЕМ userData.id
        telegram_id: userData.telegram_id // ← ИСПОЛЬЗУЕМ userData.telegram_id
      })
    })
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const result = await response.json()
    
    if (result.status === 'success') {
      alert(`✅ Успешно удалено ${result.deleted_count || selectedChecklists.size} чек-листов`)
      
      // Обновляем локальное состояние
      setChecklists(prev => prev.filter(c => !selectedChecklists.has(c.id)))
      setFilteredChecklists(prev => prev.filter(c => !selectedChecklists.has(c.id)))
      
      // Очищаем выбранные
      clearAllSelections()
      
      // Перезагружаем данные для свежести
      fetchChecklistsWithPhotos()
    } else {
      throw new Error(result.message || 'Ошибка при массовом удалении')
    }
  } catch (err) {
    console.error('❌ Ошибка массового удаления чек-листов:', err)
    alert('Ошибка при удалении выбранных чек-листов: ' + err.message)
  }
}

  // Удаление чек-листа
const deleteChecklist = async (checklistId, description) => {
  if (!userData || !userData.id || !userData.telegram_id) {
    alert('❌ Ошибка: данные пользователя не доступны')
    return
  }
  
  // eslint-disable-next-line no-restricted-globals
  const confirmDelete = confirm(`Удалить чек-лист #${checklistId}?\n\n"${description}"`)
  
  if (!confirmDelete) return
  
  try {
    const response = await fetch(`${API_URL}/delete-checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checklist_id: checklistId,
        admin_id: userData.id, // ← ИСПОЛЬЗУЕМ userData.id
        telegram_id: userData.telegram_id // ← ИСПОЛЬЗУЕМ userData.telegram_id
      })
    })
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const result = await response.json()
    
    if (result.status === 'success') {
      // Удаляем из локального состояния
      setChecklists(prev => prev.filter(c => c.id !== checklistId))
      setFilteredChecklists(prev => prev.filter(c => c.id !== checklistId))
      alert(`✅ Чек-лист #${checklistId} удален`)
    } else {
      throw new Error(result.message || 'Ошибка при удалении')
    }
  } catch (err) {
    console.error('❌ Ошибка удаления чек-листа:', err)
    alert('Ошибка при удалении: ' + err.message)
  }
}

  // Получение названия зоны
  const getZoneName = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId)
    return zone ? zone.name : `Зона #${zoneId}`
  }

  // Форматирование даты
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Функции для работы с модалкой фото
  const openPhotoModal = (checklist) => {
    if (!checklist.photo) return
    
    const photos = checklist.photo.includes(',') 
      ? checklist.photo.split(',').map(p => p.trim())
      : [checklist.photo]
    
    setPhotoModal({
      isOpen: true,
      photos: photos,
      currentIndex: 0
    })
  }

  const navigatePhoto = (direction) => {
    setPhotoModal(prev => {
      let newIndex = prev.currentIndex + direction
      if (newIndex < 0) newIndex = prev.photos.length - 1
      if (newIndex >= prev.photos.length) newIndex = 0
      return { ...prev, currentIndex: newIndex }
    })
  }

  const closePhotoModal = () => {
    setPhotoModal({
      isOpen: false,
      photos: [],
      currentIndex: 0
    })
  }

  // Обработчики фильтров
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    applyFilters(checklists)
  }

  const resetFilters = () => {
    const defaultFilters = {
      dateSort: 'desc',
      showOnlyImportant: true,
      zoneId: ''
    }
    setFilters(defaultFilters)
    applyFilters(checklists)
  }

  // Загрузка данных при монтировании
  useEffect(() => {
    fetchZones()
    fetchChecklistsWithPhotos()
  }, [])

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Заголовок */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 20px 0', color: '#2d3748' }}>
          📸 Чек-листы с фотографиями
        </h1>
        
        {/* Статистика */}
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            backgroundColor: '#edf2f7',
            padding: '10px 15px',
            borderRadius: '8px',
            minWidth: '150px'
          }}>
            <div style={{ fontSize: '12px', color: '#718096' }}>Всего чек-листов</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3748' }}>
              {checklists.length}
            </div>
          </div>
          
          <div style={{
            backgroundColor: '#fffaf0',
            padding: '10px 15px',
            borderRadius: '8px',
            minWidth: '150px'
          }}>
            <div style={{ fontSize: '12px', color: '#d69e2e' }}>Важных чек-листов</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d69e2e' }}>
              {checklists.filter(c => c.important).length}
            </div>
          </div>
        </div>
        
        {/* Фильтры */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          {/* Сортировка по дате */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#4a5568'
            }}>
              📅 Сортировка по дате
            </label>
            <select
              value={filters.dateSort}
              onChange={(e) => handleFilterChange('dateSort', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="desc">Сначала новые</option>
              <option value="asc">Сначала старые</option>
            </select>
          </div>
          
          {/* Фильтр по зоне */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#4a5568'
            }}>
              📍 Фильтр по зоне
            </label>
            <select
              value={filters.zoneId}
              onChange={(e) => handleFilterChange('zoneId', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="">Все зоны</option>
              {zones.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} (#{zone.id})
                </option>
              ))}
            </select>
          </div>
          
          {/* Блок с чекбоксами для фильтрации по важности */}
<div style={{
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '10px 0'
}}>
  {/* Только важные */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <input
      type="checkbox"
      id="importantOnly"
      checked={filters.showOnlyImportant}
      onChange={(e) => handleFilterChange('showOnlyImportant', e.target.checked)}
      style={{
        width: '20px',
        height: '20px',
        cursor: 'pointer'
      }}
    />
    <label htmlFor="importantOnly" style={{
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#4a5568',
      cursor: 'pointer'
    }}>
      ⭐ Только важные чек-листы
    </label>
  </div>
  
  {/* Обычные чек-листы */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <input
      type="checkbox"
      id="normalOnly"
      checked={filters.showOnlyNormal}
      onChange={(e) => handleFilterChange('showOnlyNormal', e.target.checked)}
      style={{
        width: '20px',
        height: '20px',
        cursor: 'pointer'
      }}
    />
    <label htmlFor="normalOnly" style={{
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#4a5568',
      cursor: 'pointer'
    }}>
      📝 Только обычные чек-листы
    </label>
  </div>
</div>
          
          {/* Кнопки действий */}
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end'
          }}>
            <button
              onClick={resetFilters}
              style={{
                padding: '10px 20px',
                backgroundColor: '#a0aec0',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                flex: 1
              }}
            >
              🔄 Сбросить
            </button>
            
            <button
              onClick={fetchChecklistsWithPhotos}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                flex: 1
              }}
            >
              🔁 Обновить
            </button>
          </div>
        </div>


        {/* Блок выбранных элементов */}
{selectedChecklists.size > 0 && (
  <div style={{
    backgroundColor: '#ebf8ff',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #bee3f8',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <div>
      <strong style={{ color: '#2c5282' }}>✅ Выбрано: {selectedChecklists.size} чек-листов</strong>
      <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '5px' }}>
        ID: {Array.from(selectedChecklists).join(', ')}
      </div>
    </div>
    <div style={{ display: 'flex', gap: '10px' }}>
      <button
        onClick={clearAllSelections}
        style={{
          padding: '8px 16px',
          backgroundColor: '#a0aec0',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        ❌ Снять выделение
      </button>
      <button
        onClick={deleteSelectedChecklists}
        style={{
          padding: '8px 16px',
          backgroundColor: '#e53e3e',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        🗑️ Удалить выбранные
      </button>
    </div>
  </div>
)}

      </div>

      {/* Таблица с чек-листами */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflowX: 'auto'
      }}>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#718096'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
            <div>Загрузка чек-листов...</div>
          </div>
        ) : error ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#e53e3e'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
            <h3>Ошибка загрузки</h3>
            <p>{error}</p>
            <button
              onClick={fetchChecklistsWithPhotos}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              Повторить попытку
            </button>
          </div>
        ) : filteredChecklists.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#718096'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
            <h3>Чек-листы не найдены</h3>
            <p>Попробуйте изменить фильтры</p>
          </div>
        ) : (
          <>
            <div style={{
              marginBottom: '20px',
              fontSize: '14px',
              color: '#718096',
              textAlign: 'center'
            }}>
              Показано {filteredChecklists.length} из {checklists.length} чек-листов
            </div>
            
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f7fafc',
                  borderBottom: '2px solid #e2e8f0'
                }}>
                  <th style={{
      padding: '12px',
      textAlign: 'center',
      fontWeight: 'bold',
      color: '#4a5568',
      fontSize: '14px',
      width: '50px'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
        <input
          type="checkbox"
          checked={filters.selectAll}
          onChange={() => {
            if (filters.selectAll) {
              clearAllSelections()
            } else {
              selectAllInFilter()
            }
          }}
          style={{
            width: '18px',
            height: '18px',
            cursor: 'pointer'
          }}
          title={filters.selectAll ? "Снять все выделения" : "Выбрать все"}
        />
        <span style={{ fontSize: '11px', color: '#718096' }}>
          {selectedChecklists.size > 0 ? `Выбрано: ${selectedChecklists.size}` : 'Выбрать'}
        </span>
      </div>
    </th>

                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#4a5568',
                    fontSize: '14px'
                  }}>ID</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#4a5568',
                    fontSize: '14px'
                  }}>Дата</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#4a5568',
                    fontSize: '14px'
                  }}>Зона</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#4a5568',
                    fontSize: '14px'
                  }}>Описание</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#4a5568',
                    fontSize: '14px'
                  }}>Фото</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#4a5568',
                    fontSize: '14px'
                  }}>Статус</th>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#4a5568',
                    fontSize: '14px'
                  }}>Действия</th>
                </tr>
              </thead>
              <tbody>
  {filteredChecklists.map((checklist, index) => (
    <tr 
      key={checklist.id}
      style={{
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: checklist.important ? '#fffaf0' : 'white',
        outline: checklist.important ? '2px solid #d69e2e' : 'none',
        outlineOffset: '-2px',
        // Добавляем подсветку для выбранных строк
        backgroundColor: selectedChecklists.has(checklist.id) 
          ? (checklist.important ? '#fefcbf' : '#ebf8ff') 
          : (checklist.important ? '#fffaf0' : 'white')
      }}
    >
      {/* НОВАЯ КОЛОНКА - ГАЛОЧКА ВЫБОРА */}
      <td style={{
        padding: '12px',
        textAlign: 'center'
      }}>
        <input
          type="checkbox"
          checked={selectedChecklists.has(checklist.id)}
          onChange={() => toggleChecklistSelection(checklist.id)}
          style={{
            width: '18px',
            height: '18px',
            cursor: 'pointer'
          }}
        />
      </td>
                    <td style={{
                      padding: '12px',
                      fontSize: '14px',
                      color: '#2d3748',
                      fontWeight: checklist.important ? 'bold' : 'normal'
                    }}>
                      #{checklist.id}
                      {checklist.important && (
                        <span style={{
                          marginLeft: '5px',
                          color: '#d69e2e'
                        }}>⭐</span>
                      )}
                    </td>
                    <td style={{
                      padding: '12px',
                      fontSize: '14px',
                      color: '#4a5568'
                    }}>
                      {formatDate(checklist.date)}
                    </td>
                    <td style={{
                      padding: '12px',
                      fontSize: '14px',
                      color: '#4a5568'
                    }}>
                      {getZoneName(checklist.zone_id)}
                    </td>
                    <td style={{
                      padding: '12px',
                      fontSize: '14px',
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {checklist.description}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {checklist.photo && (
                        <div style={{
                          display: 'flex',
                          gap: '5px',
                          flexWrap: 'wrap'
                        }}>
                          {checklist.photo.includes(',') ? (
                            checklist.photo.split(',').slice(0, 3).map((photo, idx) => (
                              <div key={idx} style={{ position: 'relative' }}>
                                <img
                                  src={`${API_URL.replace('/api', '')}${photo.trim()}`}
                                  alt={`Фото ${idx + 1}`}
                                  style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '4px',
                                    objectFit: 'cover',
                                    border: '1px solid #e2e8f0',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    openPhotoModal(checklist)
                                    setPhotoModal(prev => ({
                                      ...prev,
                                      currentIndex: idx
                                    }))
                                  }}
                                />
                                {checklist.photo.split(',').length > 1 && idx === 2 && (
                                  <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => openPhotoModal(checklist)}>
                                    +{checklist.photo.split(',').length - 3}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <img
                              src={`${API_URL.replace('/api', '')}${checklist.photo}`}
                              alt="Фото чек-листа"
                              style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '4px',
                                objectFit: 'cover',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer'
                              }}
                              onClick={() => openPhotoModal(checklist)}
                            />
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: checklist.status ? '#38a169' : '#e53e3e',
                          color: 'white',
                          display: 'inline-block',
                          width: 'fit-content'
                        }}>
                          {checklist.status ? '✅ Выполнено' : '❌ Не выполнено'}
                        </span>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: checklist.confirmed ? '#4299e1' : '#a0aec0',
                          color: 'white',
                          display: 'inline-block',
                          width: 'fit-content'
                        }}>
                          {checklist.confirmed ? '☑ Подтверждено' : '❓ Не подтверждено'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <button
                          onClick={() => openPhotoModal(checklist)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#4299e1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          👁️ Просмотр
                        </button>
                        <button
                          onClick={() => deleteChecklist(checklist.id, checklist.description)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#e53e3e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          🗑️ Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
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
            padding: '20px'
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
              zIndex: 2001
            }}
          >
            ✕
          </button>

          {/* Счетчик */}
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
              zIndex: 2001
            }}
          >
            {photoModal.currentIndex + 1} / {photoModal.photos.length}
          </div>

          {/* Контейнер фото */}
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
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
                objectFit: 'contain'
              }}
            />

            {/* Навигация */}
            {photoModal.photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigatePhoto(-1)
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
                    justifyContent: 'center'
                  }}
                >
                  ◀
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigatePhoto(1)
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
                    justifyContent: 'center'
                  }}
                >
                  ▶
                </button>
              </>
            )}
          </div>

          {/* Миниатюры */}
          {photoModal.photos.length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                padding: '10px',
                overflowX: 'auto',
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 2001
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
                    opacity: index === photoModal.currentIndex ? 1 : 0.7
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPhotoModal(prev => ({ ...prev, currentIndex: index }))
                  }}
                >
                  <img
                    src={`${API_URL.replace('/api', '')}${photo.trim()}`}
                    alt={`Миниатюра ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PhotoChecklistsPage