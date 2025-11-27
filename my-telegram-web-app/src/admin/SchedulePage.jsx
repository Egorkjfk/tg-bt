import React, { useState, useEffect } from 'react'
import { API_URL, API_BASE_URL } from '../constants/api'

const SchedulePage = ({ userData, worker, onBack }) => {
	const [schedules, setSchedules] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [weekOffset, setWeekOffset] = useState(0)
	const [zones, setZones] = useState([])
	const [showAddModal, setShowAddModal] = useState(false)
	const [newSchedule, setNewSchedule] = useState({
			worker_id: worker.id,
			zone_id: null, // или 0, но лучше null для проверки
			dates: [], // изменяем на массив дат
			planned_start_time: '09:00',
			planned_end_time: '18:00'
		})

	// Загрузка расписания
	const fetchSchedule = async () => {
		try {
			setLoading(true)
			setError(null)

			const response = await fetch(`${API_URL}/get-worker-weekly-schedule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					worker_id: worker.id,
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
			const dayIndex = date.getDay()
			return isNaN(dayIndex) ? 'Н/Д' : days[dayIndex]
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

	// Обработчик создания нового расписания
		const handleCreateSchedule = async () => {
			if (!newSchedule.zone_id && newSchedule.zone_id !== 0 || newSchedule.dates.length === 0) {
				alert('Пожалуйста, заполните все обязательные поля')
				return
			}
	
			try {
				// Создаем отдельные записи для каждой даты
				for (const date of newSchedule.dates) {
					const response = await fetch(`${API_URL}/create-schedule`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							worker_id: newSchedule.worker_id,
							zone_id: newSchedule.zone_id,
							date: date,
							planned_start_time: newSchedule.planned_start_time,
							planned_end_time: newSchedule.planned_end_time,
							admin_id: userData.id,
							telegram_id: userData.telegram_id,
						}),
					})
	
					if (!response.ok)
						throw new Error(`HTTP error! status: ${response.status}`)
	
					const result = await response.json()
	
					if (result.status !== 'success') {
						throw new Error(result.message || 'Ошибка при создании смены')
					}
				}
	
				setShowAddModal(false)
				setNewSchedule({
					worker_id: worker.id,
					zone_id: null,
					dates: [],
					planned_start_time: '09:00',
					planned_end_time: '18:00'
				})
				fetchSchedule() // Обновляем расписание
				alert('Смены успешно добавлены!')
			} catch (err) {
				console.error('❌ Ошибка создания смены:', err)
				alert('Ошибка при создании смены: ' + err.message)
			}
		}

	// Обработчик обновления времени начала
	const handleUpdateStartTime = async (scheduleId, time) => {
		try {
			const response = await fetch(`${API_URL}/update-actual-start-time`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					schedule_id: scheduleId,
					time: time,
					admin_id: userData.id,
					telegram_id: userData.telegram_id,
				}),
			})

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`)

			const result = await response.json()

			if (result.status === 'success') {
				// Обновляем локальное состояние
				setSchedules(prevSchedules =>
					prevSchedules.map(schedule =>
						schedule.id === scheduleId
							? { ...schedule, actual_start_time: time }
							: schedule
					)
				)
			} else {
				throw new Error(result.message || 'Ошибка при обновлении времени начала')
			}
		} catch (err) {
			console.error('❌ Ошибка обновления времени начала:', err)
			alert('Ошибка при обновлении времени начала: ' + err.message)
		}
	}

	// Обработчик обновления времени окончания
	const handleUpdateEndTime = async (scheduleId, time) => {
		try {
			const response = await fetch(`${API_URL}/update-actual-end-time`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					schedule_id: scheduleId,
					time: time,
					admin_id: userData.id,
					telegram_id: userData.telegram_id,
				}),
			})

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`)

			const result = await response.json()

			if (result.status === 'success') {
				// Обновляем локальное состояние
				setSchedules(prevSchedules =>
					prevSchedules.map(schedule =>
						schedule.id === scheduleId
							? { ...schedule, actual_end_time: time }
							: schedule
					)
				)
			} else {
				throw new Error(result.message || 'Ошибка при обновлении времени окончания')
			}
		} catch (err) {
			console.error('❌ Ошибка обновления времени окончания:', err)
			alert('Ошибка при обновлении времени окончания: ' + err.message)
		}
	}
	
	// Обработчик удаления расписания
	const handleDeleteSchedule = async (scheduleId, scheduleDate) => {
		const confirmDelete = window.confirm('Вы уверены, что хотите удалить это расписание?')
		if (!confirmDelete) return
		
		// Проверяем, что дата не прошедшая
		const currentDate = new Date()
		const scheduleDateObj = new Date(scheduleDate.split('T')[0])
		
		// Устанавливаем текущую дату начало дня для корректного сравнения
		currentDate.setHours(0, 0, 0, 0)
		scheduleDateObj.setHours(0, 0, 0, 0)
		
		if (scheduleDateObj < currentDate) {
			alert('Невозможно удалить расписание с прошедшей датой')
			return
		}
		
		try {
			const response = await fetch(`${API_URL}/delete-schedule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					schedule_id: scheduleId,
					admin_id: userData.id,
					telegram_id: userData.telegram_id,
				}),
			})
			
			if (!response.ok) {
				const errorResult = await response.json()
				throw new Error(errorResult.message || `HTTP error! status: ${response.status}`)
			}
			
			const result = await response.json()
			
			if (result.status === 'success') {
				// Удаляем расписание из локального состояния
				setSchedules(prevSchedules =>
					prevSchedules.filter(schedule => schedule.id !== scheduleId)
				)
				alert('Расписание успешно удалено')
			} else {
				throw new Error(result.message || 'Ошибка при удалении расписания')
			}
		} catch (err) {
			console.error('❌ Ошибка удаления расписания:', err)
			alert('Ошибка при удалении расписания: ' + err.message)
		}
	}
	
	useEffect(() => {
		if (worker) {
			fetchSchedule()
			fetchZones()
		}
	}, [worker, weekOffset])
	
	return (
	<div
			style={{
				padding: '15px',
				fontFamily: 'system-ui, sans-serif',
				backgroundColor: '#f8fafc',
				minHeight: '100vh',
			}}
		>
			{/* Заголовок */}
			<div
				style={{
					backgroundColor: 'white',
					borderRadius: '16px',
					padding: '20px',
					marginBottom: '15px',
					boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
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
					<h1
						style={{
							color: '#05969',
							margin: 0,
							fontSize: '20px',
						}}
					>
						📅 Расписание {worker.first_name}
					</h1>
				</div>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '8px',
						fontSize: '14px',
						color: '#4b5563',
					}}
				>
					<div style={{ display: 'flex', justifyContent: 'space-between' }}>
						<span>👤 Имя:</span>
						<span style={{ fontWeight: '500' }}>{worker.first_name}</span>
					</div>
					{worker.last_name && (
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span>📋 Фамилия:</span>
							<span style={{ fontWeight: '500' }}>{worker.last_name}</span>
						</div>
					)}
					{worker.phone_number && (
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span>📞 Телефон:</span>
							<span style={{ fontWeight: '500' }}>{worker.phone_number}</span>
						</div>
					)}
					<div style={{ display: 'flex', justifyContent: 'space-between' }}>
						<span>🆔 ID:</span>
						<span style={{ fontWeight: '500' }}>{worker.id}</span>
					</div>
				</div>
			</div>

			{/* Расписание */}
			<div
				style={{
					backgroundColor: 'white',
					borderRadius: '16px',
					padding: '20px',
					boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
				}}
			>
				{/* Заголовок расписания */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '20px',
					}}
				>
					<h2
						style={{
							margin: 0,
							color: '#1f2937',
							fontSize: '18px',
						}}
					>
						📋 Смены
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

				{/* Навигация по неделям и кнопка добавления */}
				<div
					style={{
						display: 'flex',
						gap: '8px',
						marginBottom: '20px',
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
					<button
						onClick={() => setShowAddModal(true)}
						style={{
							flex: 1,
							padding: '10px',
							backgroundColor: '#10b981',
							color: 'white',
							border: 'none',
							borderRadius: '10px',
							cursor: 'pointer',
							fontSize: '14px',
						}}
					>
						➕ Добавить
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
							На эту неделю у работника нет запланированных смен
						</div>
					</div>
				) : (
					<div style={{ maxHeight: '400px', overflowY: 'auto' }}>
						{schedules.map((schedule, index) => (
							<div
								key={schedule.id}
								style={{
									padding: '16px',
									border: '1px solid #e5e7eb',
									borderRadius: '12px',
									marginBottom: '12px',
									backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
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
											fontSize: '12px',
											color: '#6b7280',
										}}
									>
										Зона #{schedule.zone_id}
									</div>
								</div>
								
								{/* Отображение изображения зоны */}
								{(() => {
									const zone = zones.find(z => z.id === schedule.zone_id);
									return zone && zone.image_path ? (
										<div style={{ marginTop: '12px', textAlign: 'center' }}>
											<img
												src={`${API_BASE_URL}${zone.image_path}`}
												alt={zone.name}
												style={{
													maxWidth: '100%',
													maxHeight: '100px',
													borderRadius: '8px',
													border: '1px solid #e5e7eb',
												}}
											/>
											<div style={{ fontSize: '12px', marginTop: '4px', color: '#4b5563' }}>
												{zone.name}
											</div>
										</div>
									) : null;
								})()}

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

								{/* Ввод фактического времени */}
								<div
									style={{
										marginTop: '12px',
										display: 'grid',
										gridTemplateColumns: '1fr 1fr',
										gap: '8px',
									}}
								>
									<div>
										<input
											type="time"
											value={schedule.actual_start_time ? formatTime(schedule.actual_start_time) : ''}
											onChange={(e) => handleUpdateStartTime(schedule.id, e.target.value)}
											style={{
												width: '100%',
												padding: '6px',
												border: '1px solid #d1d5db',
												borderRadius: '6px',
												fontSize: '12px',
												backgroundColor: schedule.actual_start_time ? 'white' : 'white',
											}}
											placeholder="Начало"
										/>
									</div>
									<div>
										<input
											type="time"
											value={schedule.actual_end_time ? formatTime(schedule.actual_end_time) : ''}
											onChange={(e) => handleUpdateEndTime(schedule.id, e.target.value)}
											style={{
												width: '100%',
												padding: '6px',
												border: '1px solid #d1d5db',
												borderRadius: '6px',
												fontSize: '12px',
												backgroundColor: schedule.actual_start_time ? 'white' : '#f3f4f6',
											}}
											placeholder="Конец"
											disabled={!schedule.actual_start_time}
										/>
									</div>
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
								
								{/* Кнопка удаления расписания */}
								{(() => {
									const currentDate = new Date()
									const scheduleDateObj = new Date(schedule.date.split('T')[0])
									
									// Устанавливаем текущую дату начало дня для корректного сравнения
									currentDate.setHours(0, 0, 0, 0)
									scheduleDateObj.setHours(0, 0, 0, 0)
									
									// Показываем кнопку удаления только для текущей даты или будущих дат
									if (scheduleDateObj >= currentDate) {
										return (
											<div style={{ marginTop: '12px', textAlign: 'center' }}>
												<button
													onClick={() => handleDeleteSchedule(schedule.id, schedule.date)}
													style={{
														padding: '6px 12px',
														backgroundColor: '#e53e3e',
														color: 'white',
														border: 'none',
														borderRadius: '6px',
														cursor: 'pointer',
														fontSize: '12px',
														fontWeight: 'bold',
													}}
												>
													🗑️ Удалить
												</button>
											</div>
										)
									}
									return null
								})()}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Модальное окно добавления смены */}
			{showAddModal && (
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
					}}
				>
					<div
						style={{
							backgroundColor: 'white',
							padding: '20px',
							borderRadius: '12px',
							width: '90%',
							maxWidth: '500px',
							maxHeight: '80vh',
							overflowY: 'auto',
						}}
					>
						<h3>➕ Добавить смену</h3>

						<div style={{ marginBottom: '15px' }}>
							<label
								style={{
									display: 'block',
									marginBottom: '5px',
									fontWeight: 'bold',
									fontSize: '14px',
								}}
							>
								Зона:
							</label>
							<select
								value={newSchedule.zone_id || ''}
								onChange={(e) => setNewSchedule({...newSchedule, zone_id: e.target.value ? parseInt(e.target.value) : null})}
								style={{
									width: '100%',
									padding: '8px',
									border: '1px solid #ddd',
									borderRadius: '5px',
								}}
							>
							<option value="">Выберите зону</option>
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
															fontSize: '14px',
														}}
													>
														Даты:
													</label>
													<input
														type="date"
														multiple // Добавляем возможность выбора нескольких дат
														value=""
														onChange={(e) => {
															// Добавляем выбранную дату к существующему массиву
															const newDate = e.target.value;
															if (newDate && !newSchedule.dates.includes(newDate)) {
																setNewSchedule({
																	...newSchedule,
																	dates: [...newSchedule.dates, newDate]
																});
															}
														}}
														style={{
															width: '100%',
															padding: '8px',
															border: '1px solid #ddd',
															borderRadius: '5px',
														}}
													/>
													{/* Отображение выбранных дат с возможностью удаления */}
													{newSchedule.dates.length > 0 && (
														<div style={{ marginTop: '10px' }}>
															{newSchedule.dates.map((date, index) => (
																<span
																	key={index}
																	style={{
																		display: 'inline-block',
																		padding: '4px 8px',
																		margin: '2px',
																		backgroundColor: '#3b82f6',
																		color: 'white',
																		borderRadius: '12px',
																		fontSize: '12px'
																	}}
																>
																	{date}
																	<button
																		onClick={() => {
																			const newDates = [...newSchedule.dates];
																			newDates.splice(index, 1);
																			setNewSchedule({
																				...newSchedule,
																				dates: newDates
																			});
																		}}
																		style={{
																			marginLeft: '5px',
																			background: 'none',
																			border: 'none',
																			color: 'white',
																			cursor: 'pointer',
																			fontSize: '14px'
																		}}
																	>
																		×
																	</button>
																</span>
															))}
														</div>
													)}
												</div>

						<div style={{ marginBottom: '15px' }}>
							<label
								style={{
									display: 'block',
									marginBottom: '5px',
									fontWeight: 'bold',
									fontSize: '14px',
								}}
							>
								Время начала:
							</label>
							<input
								type="time"
								value={newSchedule.planned_start_time}
								onChange={(e) => setNewSchedule({...newSchedule, planned_start_time: e.target.value})}
								style={{
									width: '100%',
									padding: '8px',
									border: '1px solid #ddd',
									borderRadius: '5px',
								}}
							/>
						</div>

						<div style={{ marginBottom: '20px' }}>
							<label
								style={{
									display: 'block',
									marginBottom: '5px',
									fontWeight: 'bold',
									fontSize: '14px',
								}}
							>
								Время окончания:
							</label>
							<input
								type="time"
								value={newSchedule.planned_end_time}
								onChange={(e) => setNewSchedule({...newSchedule, planned_end_time: e.target.value})}
								style={{
									width: '100%',
									padding: '8px',
									border: '1px solid #ddd',
									borderRadius: '5px',
								}}
							/>
						</div>

						<div style={{ display: 'flex', gap: '10px' }}>
							<button
								onClick={handleCreateSchedule}
								style={{
									padding: '10px 20px',
									backgroundColor: '#38a169',
									color: 'white',
									border: 'none',
									borderRadius: '5px',
									cursor: 'pointer',
									flex: 1,
								}}
							>
								💾 Сохранить
							</button>
							<button
								onClick={() => {
									setShowAddModal(false)
									setNewSchedule({
																			worker_id: worker.id,
																			zone_id: null,
																			dates: [],
																			planned_start_time: '09:00',
																			planned_end_time: '18:00'
																		})
								}}
								style={{
									padding: '10px 20px',
									backgroundColor: '#e53e3e',
									color: 'white',
									border: 'none',
									borderRadius: '5px',
									cursor: 'pointer',
									flex: 1,
								}}
							>
								❌ Отмена
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default SchedulePage