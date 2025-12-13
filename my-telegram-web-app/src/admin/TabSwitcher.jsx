import React from 'react'

const TabSwitcher = ({ activeTab, setActiveTab }) => (
	<div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
		<button
			onClick={() => setActiveTab('users')}
			style={{
				padding: '10px 20px',
				backgroundColor: activeTab === 'users' ? '#4299e1' : '#e2e8f0',
				color: activeTab === 'users' ? 'white' : 'black',
				border: 'none',
				borderRadius: '8px',
				cursor: 'pointer',
				flex: 1,
			}}
		>
			👥 Пользователи
		</button>
	<button
			onClick={() => setActiveTab('zones')}
			style={{
				padding: '10px 20px',
				backgroundColor: activeTab === 'zones' ? '#4299e1' : '#e2e8f0',
				color: activeTab === 'zones' ? 'white' : 'black',
				border: 'none',
				borderRadius: '8px',
				cursor: 'pointer',
				flex: 1,
			}}
		>
			📍 Зоны
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
				padding: '10px 20px',
				backgroundColor: activeTab === 'salary' ? '#4299e1' : '#e2e8f0',
				color: activeTab === 'salary' ? 'white' : 'black',
				border: 'none',
				borderRadius: '8px',
				cursor: 'pointer',
				flex: 1,
			}}
		>
			💰 ЗП
		</button>
		<button
			onClick={() => setActiveTab('bonuses-fines')}
			style={{
				padding: '10px 20px',
				backgroundColor: activeTab === 'bonuses-fines' ? '#4299e1' : '#e2e8f0',
				color: activeTab === 'bonuses-fines' ? 'white' : 'black',
				border: 'none',
				borderRadius: '8px',
				cursor: 'pointer',
				flex: 1,
			}}
		>
			🎁 Премии и штрафы
	</button>
	<button
			onClick={() => setActiveTab('all-schedules')}
			style={{
				padding: '10px 20px',
				backgroundColor: activeTab === 'all-schedules' ? '#4299e1' : '#e2e8f0',
				color: activeTab === 'all-schedules' ? 'white' : 'black',
				border: 'none',
				borderRadius: '8px',
				cursor: 'pointer',
				flex: 1,
			}}
		>
			📅 Общее расписание
	</button>
	</div>
)

export default TabSwitcher
