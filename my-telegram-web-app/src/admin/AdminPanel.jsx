import React, { useState, useEffect, useContext } from 'react'
import TabSwitcher from './TabSwitcher'
import UsersTab from './UsersTab'
import ZonesTab from './ZonesTab'
import ZoneEditPage from './ZoneEditPage'
import SchedulePage from './SchedulePage'
import AllWorkersSchedulePage from './AllWorkersSchedulePage'
import ChecklistsPage from './ChecklistsPage'
import AutoChecklistsPage from './AutoChecklistsPage'
import AdminSalaryPage from './AdminSalaryPage'
import BonusesFinesTab from './BonusesFinesTab'
import { AdminMQTTContext } from '../AdminMQTT'

const AdminPanel = ({ userData, onOpenChecklists, onOpenChecklistsFromZones, initialActiveTab = 'users' }) => {
	const [activeTab, setActiveTab] = useState(initialActiveTab)
	const [editingZoneId, setEditingZoneId] = useState(null)
	const [scheduleUser, setScheduleUser] = useState(null)
	const [showAllSchedules, setShowAllSchedules] = useState(false)
	const [autoChecklistZoneId, setAutoChecklistZoneId] = useState(null)
	const [autoChecklistZoneName, setAutoChecklistZoneName] = useState('')
  const [shownNotifications, setShownNotifications] = useState(() => {
    const saved = localStorage.getItem('adminPanelShownNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  useEffect(() => {
    localStorage.setItem('adminPanelShownNotifications', JSON.stringify([...shownNotifications]));
  }, [shownNotifications]);

  const mqttContext = useContext(AdminMQTTContext);
  const { connected, messages } = mqttContext || {};
	

  // Обработка MQTT сообщений
  useEffect(() => {
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Обрабатываем сообщения о новых чек-листах, статусах и фото
      if (lastMessage.type === 'checklist' || lastMessage.type === 'status' || lastMessage.type === 'photo') {
        console.log('📥 Получено обновление чек-листа:', lastMessage);
        
        // Показываем уведомление, если это не дубль
        const notificationId = `admin_panel_${lastMessage.type}_${lastMessage.checklist_id}_${Date.now()}`;
        if (!shownNotifications.has(notificationId)) {
          setShownNotifications(prev => new Set([...prev, notificationId]));
          
          // В админской панели не используем WebApp уведомления, чтобы избежать ошибок
          if (lastMessage.type === 'photo') {
            console.log(`📸 Пользователь загрузил фото для чек-листа #${lastMessage.checklist_id}`);
          } else if (lastMessage.type === 'status') {
            console.log(`🔄 Статус чек-листа #${lastMessage.checklist_id} обновлён`);
          }
        }
      }
    }
  }, [messages, shownNotifications, setShownNotifications]);

 // Функция для открытия страницы редактирования зоны
 const handleEditZone = (zoneId) => {
  setEditingZoneId(zoneId)
 }

 // Функция для открытия страницы авточеклистов
 const handleOpenAutoChecklists = (zoneId, zoneName) => {
  setAutoChecklistZoneId(zoneId)
  setAutoChecklistZoneName(zoneName || `Зона #${zoneId}`)
 }

 // Функция для возврата к списку зон
 const handleBackToZones = () => {
  setEditingZoneId(null)
  setActiveTab('zones')
 }

 // Если открыта страница редактирования зоны, показываем её
 if (editingZoneId) {
 return (
 	<ZoneEditPage
 		userData={userData}
 		zoneId={editingZoneId}
 		onBack={handleBackToZones}
 	/>
 )
 }

 // Если выбрана зона для просмотра авточеклистов, показываем страницу авточеклистов
 if (autoChecklistZoneId) {
  return (
    <AutoChecklistsPage
      zoneId={autoChecklistZoneId}
      zoneName={autoChecklistZoneName}
      userData={userData}
      onBack={() => {
        setAutoChecklistZoneId(null)
        setAutoChecklistZoneName('')
      }}
    />
  )
 }

 // Если выбран пользователь для просмотра расписания, показываем страницу расписания
 if (scheduleUser) {
 	return (
 		<SchedulePage
 			userData={userData}
 			worker={scheduleUser}
 			onBack={() => setScheduleUser(null)}
 		/>
 	)
 }

// Если выбрано отображение общего расписания, показываем страницу общего расписания
 if (showAllSchedules) {
 	return (
 		<AllWorkersSchedulePage
 			userData={userData}
 			onBack={() => setShowAllSchedules(false)}
 		/>
 	)
 }

 return (
		<div
			style={{
				padding: '0px',
				backgroundColor: '#f5f5f5',
				minHeight: '100vh',
				fontFamily: 'system-ui, sans-serif',
				margin: '0',
				width: '100%',
				overflow: 'hidden'
			}}
		>
			{/* Заголовок */}
			<div
				style={{
					backgroundColor: 'white',
					borderRadius: '12px',
					padding: '20px',
					marginBottom: '20px',
					textAlign: 'center',
					boxShadow: '0 2px 4px rgba(0,0,0.1)',
				}}
			>
				<h1 style={{ margin: 0, color: '#2d3748' }}>
					⚙️ Панель администратора
				</h1>
				<p style={{ margin: '5px 0 0', color: '#718096' }}>
					Добро пожаловать, {userData.first_name}!
				</p>
	       {connected && (
	         <span style={{ fontSize: '12px', color: '#38a169', marginTop: '5px', display: 'block' }}>
	           🔴 Live (Admin) | Подключено к зонам
	         </span>
	       )}
			</div>

			{/* Переключатель вкладок */}
			<TabSwitcher activeTab={activeTab} setActiveTab={setActiveTab} />

			{/* Контент вкладок */}
			{activeTab === 'users' && <UsersTab userData={userData} openSchedulePage={setScheduleUser} onShowAllSchedules={() => setShowAllSchedules(true)} />}
			{activeTab === 'all-schedules' && <AllWorkersSchedulePage userData={userData} onBack={() => setActiveTab('users')} />}
			{activeTab === 'zones' && (
				<ZonesTab
					userData={userData}
					onOpenChecklists={onOpenChecklists}
					onOpenChecklistsFromZones={onOpenChecklistsFromZones || onOpenChecklists}
					onEditZone={handleEditZone}
					onOpenAutoChecklists={handleOpenAutoChecklists}
				/>
			)}
			{activeTab === 'checklists' && (
				<ChecklistsPage
					userData={userData}
					zoneId={null}
					onBack={() => setActiveTab('users')}
					onBackToZones={() => setActiveTab('zones')}
					fullWidth={true}
				/>
			)}
			{activeTab === 'salary' && <AdminSalaryPage userData={userData} />}
			{activeTab === 'bonuses-fines' && <BonusesFinesTab userData={userData} />}
		</div>
	)
}

export default AdminPanel