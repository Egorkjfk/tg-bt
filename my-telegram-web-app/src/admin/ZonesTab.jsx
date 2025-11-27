import React, { useEffect, useState } from 'react'
import { API_URL, API_BASE_URL } from '../constants/api'
import ZoneEditModal from './ZoneEditModal'
import { createZone } from '../api/zones'

const ZonesTab = ({ userData, onOpenChecklists, onEditZone, onOpenChecklistsFromZones, onOpenAutoChecklists }) => {
	const [allZones, setAllZones] = useState([])
	const [zonesLoading, setZonesLoading] = useState(false)
	const [error, setError] = useState(null)
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [newZone, setNewZone] = useState({
		name: '',
		description: '',
		working_hours: '',
		image_path: '',
		price: 0
	})

	const fetchAllZones = async () => {
		try {
			setZonesLoading(true)
			const response = await fetch(`${API_URL}/get-allZones`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`)
			const result = await response.json()

			if (result.status === 'success') {
				setAllZones(result.zones || [])
			} else {
				throw new Error(result.message || 'Ошибка при загрузке зон')
			}
		} catch (err) {
			console.error('❌ Ошибка загрузки зон:', err)
			setError(err.message)
		} finally {
			setZonesLoading(false)
		}
	}

	useEffect(() => {
	fetchAllZones()
	}, [])

	// Функция для создания новой зоны
	const handleCreateZone = async (zoneId, zoneData) => {
	// Убедимся, что цена не является null или undefined, установим 0 при необходимости
	const processedZoneData = {
			...zoneData,
			price: zoneData.price || 0
		}
		
		try {
			await createZone(processedZoneData, userData)
			alert('Зона успешно создана!')
			setShowCreateModal(false)
			// Обновляем список зон
			fetchAllZones()
	} catch (err) {
			console.error('❌ Ошибка создания зоны:', err)
			alert('Ошибка при создании зоны: ' + err.message)
		}
	}

	// Функция для открытия страницы редактирования зоны
	const handleEditZone = (zoneId) => {
		if (onEditZone) {
			onEditZone(zoneId)
		}
	}

	return (
		<div
			style={{
				backgroundColor: 'white',
				borderRadius: '0px',
				padding: '0px',
				margin: '0',
				width: '100%',
				overflow: 'hidden'
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '15px',
				}}
			>
				<h3 style={{ margin: 0 }}>📍 Все зоны ({allZones.length})</h3>
				<div style={{ display: 'flex', gap: '10px' }}>
					<button
						onClick={() => {
							setNewZone({
								name: '',
								description: '',
								working_hours: '',
								image_path: '',
								price: 0
							})
							setShowCreateModal(true)
						}}
						style={{
							padding: '5px 10px',
							backgroundColor: '#4299e1',
							color: 'white',
							border: 'none',
							borderRadius: '5px',
							cursor: 'pointer',
						}}
					>
						➕ Добавить
					</button>
					<button
						onClick={fetchAllZones}
						style={{
							padding: '5px 10px',
							backgroundColor: '#38a169',
							color: 'white',
							border: 'none',
							borderRadius: '5px',
							cursor: 'pointer',
						}}
					>
						🔄 Обновить
					</button>
				</div>
			</div>
			
			{/* Модальное окно для создания зоны */}
			{showCreateModal && (
				<ZoneEditModal
					isNew={true}
					zone={newZone}
					onSave={handleCreateZone}
					onClose={() => setShowCreateModal(false)}
				/>
			)}

			{zonesLoading ? (
				<p style={{ textAlign: 'center', color: '#666' }}>Загрузка зон...</p>
			) : error ? (
				<div style={{ textAlign: 'center', padding: '20px' }}>
					<h2 style={{ color: '#e53e3e' }}>❌ Ошибка</h2>
					<p>{error}</p>
				</div>
			) : allZones.length === 0 ? (
				<p style={{ textAlign: 'center', color: '#666' }}>Зоны не найдены</p>
			) : (
				<div style={{ overflowY: 'visible' }}>
					{allZones.map((zone, index) => (
						<div
							key={zone.id}
							style={{
								padding: '12px',
								border: '1px solid #e2e8f0',
								borderRadius: '8px',
								marginBottom: '10px',
								backgroundColor: index % 2 === 0 ? '#f7fafc' : 'white',
							}}
						>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<div>
									<strong>{zone.name}</strong>
								</div>
								<div style={{ fontSize: '12px', color: '#666' }}>
									ID: {zone.id}
								</div>
							</div>
							<div
								style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}
							>
								{zone.description}
							</div>
							<div style={{ fontSize: '14px', marginTop: '5px' }}>
								🕒 {zone.working_hours}
							</div>
							<div style={{ fontSize: '14px', marginTop: '5px' }}>
								💰 {zone.price ? `${zone.price} руб.` : 'Цена не указана'}
							</div>
							{zone.image_path && (
								<div style={{ marginTop: '5px' }}>
									<img
										src={`${API_BASE_URL}${zone.image_path}`}
										alt={zone.name}
										style={{
											maxWidth: '100%',
											maxHeight: '100px',
											borderRadius: '5px',
										}}
									/>
								</div>
							)}
							<div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
								<button
									onClick={() => onEditZone(zone.id)}
									style={{
										padding: '5px 10px',
										backgroundColor: '#4299e1',
										color: 'white',
										border: 'none',
										borderRadius: '5px',
										cursor: 'pointer',
									}}
								>
									✏️ Изменить
								</button>
								<button
									onClick={() => onOpenAutoChecklists ? onOpenAutoChecklists(zone.id) : alert('Функция открытия авточек-листов не реализована')}
									style={{
										padding: '5px 10px',
										backgroundColor: '#38a169',
										color: 'white',
										border: 'none',
										borderRadius: '5px',
										cursor: 'pointer',
									}}
								>
									🤖 Авточек-лист
								</button>
								<button
									onClick={() => onOpenChecklistsFromZones ? onOpenChecklistsFromZones(zone.id) : onOpenChecklists(zone.id)}
									style={{
										padding: '5px 10px',
										backgroundColor: '#38a169',
										color: 'white',
										border: 'none',
										borderRadius: '5px',
										cursor: 'pointer',
									}}
								>
									📋 Чек-лист
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export default ZonesTab
