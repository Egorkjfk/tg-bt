import React, { useEffect, useState } from 'react'
import { useShowPopup } from '@vkruglikov/react-telegram-web-app'
import ConfirmedUserPage from './ConfirmedUserPage'
import PendingConfirmationPage from './PendingConfirmationPage'
import AdminPanel from './admin/AdminPanel'
import ChecklistsPage from './admin/ChecklistsPage'
import { API_URL } from './constants/api'
import ClientMQTTProvider from './ClientMQTT'
import { AdminMQTTProvider } from './AdminMQTT'

const UserDataLoader = ({ userData: initialUserData, onUserDataUpdate }) => {
  const showPopup = useShowPopup()
  const [userData, setUserData] = useState(initialUserData)
  const [currentPage, setCurrentPage] = useState('main')
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [initialActiveTab, setInitialActiveTab] = useState('users')
  const [mqttInitialized, setMqttInitialized] = useState(false)

  // Функция обновления данных пользователя
  const handleUserDataUpdate = (updatedData) => {
    setUserData(updatedData);
    if (onUserDataUpdate) {
      onUserDataUpdate(updatedData);
    }
  };

  // Функция для открытия страницы чек-листов
  const openChecklistsPage = zoneId => {
    setSelectedZoneId(zoneId)
    setCurrentPage('checklists')
  }
  
  // Функция для открытия страницы чек-листов из зон
  const openChecklistsPageFromZones = zoneId => {
    setSelectedZoneId(zoneId)
    setInitialActiveTab('zones')
    setCurrentPage('checklists')
  }

  // Функция для возврата на главную
  const goBackToMain = () => {
    setCurrentPage('main')
    setSelectedZoneId(null)
  }
  
  // Функция для возврата к вкладке зон
  const goBackToZones = () => {
    setCurrentPage('main')
    setSelectedZoneId(null)
    setInitialActiveTab('zones')
  }
  
  // Функция для возврата к вкладке пользователей
  const goBackToUsers = () => {
    setCurrentPage('main')
    setSelectedZoneId(null)
    setInitialActiveTab('users')
  }

  // Если данные еще не загружены, показываем загрузку
  if (!userData) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <h2>🔄 Загрузка данных...</h2>
        <p>Получаем актуальную информацию с сервера</p>
      </div>
    )
  }

  // Получаем зону пользователя (в реальной реализации нужно получить из API)
  const userZoneId = 6; // Заглушка для тестирования

  // Если открыта страница чек-листов
  if (currentPage === 'checklists') {
    return (
      <ChecklistsPage
        userData={userData}
        zoneId={selectedZoneId}
        onBack={goBackToMain}
        onBackToZones={goBackToZones}
      />
    )
  }

  // ВЫБОР СТРАНИЦЫ ПО СТАТУСУ ПОЛЬЗОВАТЕЛЯ
  // Проверяем, что все данные пользователя загружены (включая is_admin)
  if (userData && typeof userData.is_admin !== 'undefined') {
    // Используем флаг для предотвращения повторной инициализации MQTT
    if (!mqttInitialized) {
      setMqttInitialized(true);
    }
    
    if (userData.is_admin) {
      // АДМИН - показываем админ панель с функцией открытия чек-листов
      return (
        <AdminMQTTProvider userData={userData}>
          <AdminPanel
            userData={userData}
            onOpenChecklists={openChecklistsPage}
            onOpenChecklistsFromZones={openChecklistsPageFromZones}
            initialActiveTab={initialActiveTab}
          />
        </AdminMQTTProvider>
      )
    } else if (userData.confirmed) {
      // ПОДТВЕРЖДЕННЫЙ ПОЛЬЗОВАТЕЛЬ
      return (
        <ClientMQTTProvider userData={userData} onUserDataUpdate={handleUserDataUpdate}>
          <ConfirmedUserPage userData={userData} userZoneId={userZoneId} />
        </ClientMQTTProvider>
      )
    } else {
      // НОВЫЙ ПОЛЬЗОВАТЕЛЬ (не подтвержден) - показываем страницу ожидания
      return (
        <ClientMQTTProvider userData={userData} onUserDataUpdate={handleUserDataUpdate}>
          <PendingConfirmationPage userData={userData} onUserUpdate={handleUserDataUpdate} />
        </ClientMQTTProvider>
      )
    }
  } else {
    // Пока данные не загружены, показываем загрузку
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <h2>🔄 Загрузка данных...</h2>
        <p>Получаем актуальную информацию сервера</p>
      </div>
    )
  }
}

export default UserDataLoader