import React, { useState, useEffect } from 'react';
import { API_URL, API_ENDPOINTS } from '../constants/api';

const AllWorkersSchedulePage = ({ userData, onBack }) => {
	const [schedules, setSchedules] = useState([]);
	const [users, setUsers] = useState([]);
	const [zones, setZones] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [weekOffset, setWeekOffset] = useState(0);
	const [selectedCells, setSelectedCells] = useState({});
	const [serverDate, setServerDate] = useState(new Date());

	// Загрузка данных
	const fetchData = async () => {
		try {
			setLoading(true);
			setError(null);
	
			// Загрузка текущей даты с сервера
			const dateResponse = await fetch(API_ENDPOINTS.GET_CURRENT_DATE, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			});
	
			if (!dateResponse.ok)
				throw new Error(`HTTP error! status: ${dateResponse.status}`);
	
			const dateResult = await dateResponse.json();
	
			if (dateResult.status === 'success') {
				const currentDate = new Date(dateResult.date);
				setServerDate(currentDate);
			} else {
				throw new Error(dateResult.message || 'Ошибка при загрузке текущей даты');
			}
	
			// Загрузка расписания всех сотрудников
			const scheduleResponse = await fetch(API_ENDPOINTS.GET_ALL_WORKERS_WEEKLY_SCHEDULE, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					week_offset: weekOffset,
					admin_id: userData.id,
					telegram_id: userData.telegram_id,
				}),
			});
	
			if (!scheduleResponse.ok)
				throw new Error(`HTTP error! status: ${scheduleResponse.status}`);
	
			const scheduleResult = await scheduleResponse.json();
	
			if (scheduleResult.status === 'success') {
				setSchedules(scheduleResult.schedules || []);
			} else {
				throw new Error(scheduleResult.message || 'Ошибка при загрузке расписания');
			}
	
			// Загрузка пользователей
			const usersResponse = await fetch(API_ENDPOINTS.GET_ALL_USER, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			});
	
			if (!usersResponse.ok)
				throw new Error(`HTTP error! status: ${usersResponse.status}`);
	
			const usersResult = await usersResponse.json();
	
			if (usersResult.status === 'success') {
				setUsers(usersResult.users || []);
			} else {
				throw new Error(usersResult.message || 'Ошибка при загрузке пользователей');
			}
	
			// Загрузка зон
			const zonesResponse = await fetch(API_ENDPOINTS.GET_ALL_ZONES, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			});
	
			if (!zonesResponse.ok)
				throw new Error(`HTTP error! status: ${zonesResponse.status}`);
	
			const zonesResult = await zonesResponse.json();
	
			if (zonesResult.status === 'success') {
				setZones(zonesResult.zones || []);
			} else {
				throw new Error(zonesResult.message || 'Ошибка при загрузке зон');
			}
		} catch (err) {
			console.error('❌ Ошибка загрузки данных:', err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	// Навигация по неделям
	const handlePrevWeek = () => setWeekOffset(prev => prev - 1);
	const handleNextWeek = () => setWeekOffset(prev => prev + 1);
	const handleCurrentWeek = () => setWeekOffset(0);
	
	// Обработчик клика вне ячеек для закрытия списка пользователей
	const handleClickOutside = (event) => {
		const target = event.target;
		if (!target.closest('td') && !target.closest('div[style*="position: absolute"]')) {
			setSelectedCells({});
		}
	};
	
	// Добавляем обработчик клика вне компонента
	useEffect(() => {
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Получение названия дня недели
	const getDayName = dateString => {
		const cleanDate = dateString.split('T')[0];
		const date = new Date(cleanDate + 'T00:00:00');
		const days = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
		const dayIndex = date.getDay();
		return isNaN(dayIndex) ? 'Н/Д' : days[dayIndex];
	};

	// Получение числа дня
	const getDayNumber = dateString => {
		const cleanDate = dateString.split('T')[0];
		const date = new Date(cleanDate + 'T00:00:00');
		return date.getDate();
	};

	// Получение названия месяца
	const getMonthName = dateString => {
		const cleanDate = dateString.split('T')[0];
		const date = new Date(cleanDate + 'T00:00:00');
		const months = [
			'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
			'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
		];
		return months[date.getMonth()];
	};

	// Получение заголовка недели
	const getWeekTitle = () => {
		if (weekOffset === 0) return 'Текущая неделя';
		if (weekOffset === 1) return 'Следующая неделя';
		if (weekOffset === -1) return 'Прошлая неделя';
		return `${weekOffset > 0 ? 'Через' : 'Назад'} ${Math.abs(weekOffset)} ${
			Math.abs(weekOffset) === 1 ? 'неделю' : 'недели'
		}`;
	};

	// Получение дат для заголовков колонок
	const getWeekDates = () => {
		// Используем серверную дату как базовую
		const currentDate = new Date(serverDate);
		const dayOfWeek = currentDate.getDay();
		
		// Находим понедельник текущей недели
		const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
		const startDate = new Date(currentDate);
		startDate.setDate(currentDate.getDate() + daysToMonday + (weekOffset * 7));
		
		const dates = [];
		for (let i = 0; i < 7; i++) {
			const date = new Date(startDate);
			date.setDate(startDate.getDate() + i);
			dates.push(date.toISOString().split('T')[0]);
		}
		return dates;
	};
	
	// Проверка, является ли дата прошедшей
	const isPastDate = (dateString) => {
		const date = new Date(dateString);
		const today = new Date(serverDate);
		date.setHours(0, 0, 0, 0);
		today.setHours(0, 0, 0, 0);
		return date < today;
	};

	// Группировка расписания по зонам и дням
	const groupSchedulesByZoneAndDay = () => {
		const weekDates = getWeekDates();
		const result = {};

		// Инициализация всех зон и дней
		zones.forEach(zone => {
			result[zone.id] = {};
			weekDates.forEach(date => {
				result[zone.id][date] = null;
			});
		});

		// Заполнение данными
		schedules.forEach(schedule => {
			const date = schedule.date.split('T')[0];
			if (result[schedule.zone_id] && result[schedule.zone_id][date]) {
				result[schedule.zone_id][date] = schedule;
			} else if (result[schedule.zone_id]) {
				result[schedule.zone_id][date] = schedule;
			}
		});

		return result;
	};

	// Получение имени сотрудника по ID
	const getWorkerName = (workerId) => {
		const user = users.find(u => u.id === workerId);
		return user ? `${user.first_name} ${user.last_name || ''}` : 'Неизвестный';
	};
	
	// Обработчик создания расписания
	const handleCreateSchedule = async (workerId, zoneId, date) => {
		try {
			const zone = zones.find(z => z.id === zoneId);
			let startTime = '09:00';
			let endTime = '18:00';
			
			if (zone && zone.working_hours) {
				const timeMatch = zone.working_hours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
				if (timeMatch) {
					startTime = timeMatch[1];
					endTime = timeMatch[2];
				}
			}

			const response = await fetch(`${API_URL}/create-schedule`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					worker_id: workerId,
					zone_id: zoneId,
					date: date,
					planned_start_time: startTime,
					planned_end_time: endTime,
					admin_id: userData.id,
					telegram_id: userData.telegram_id,
				}),
			});

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`);

			const result = await response.json();

			if (result.status === 'success') {
				fetchData();
				alert('Смена успешно добавлена!');
			} else {
				throw new Error(result.message || 'Ошибка при создании смены');
			}
		} catch (err) {
			console.error('❌ Ошибка создания смены:', err);
			alert('Ошибка при создании смены: ' + err.message);
		}
	};
	
	// Обработчик удаления расписания для ячейки
	const handleDeleteScheduleForCell = async (zoneId, date) => {
		const existingSchedule = schedules.find(s =>
			s.zone_id === zoneId && s.date.split('T')[0] === date
		);
		
		if (existingSchedule) {
			const confirmDelete = window.confirm('Вы уверены, что хотите удалить это расписание?');
			if (!confirmDelete) return;
			
			const scheduleDateObj = new Date(existingSchedule.date.split('T')[0]);
			const currentDate = new Date(serverDate);
			
			currentDate.setHours(0, 0, 0, 0);
			scheduleDateObj.setHours(0, 0, 0, 0);
			
			if (scheduleDateObj < currentDate) {
				alert('Невозможно удалить расписание с прошедшей датой');
				return;
			}
			
			try {
				const response = await fetch(`${API_URL}/delete-schedule`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						schedule_id: existingSchedule.id,
						admin_id: userData.id,
						telegram_id: userData.telegram_id,
					}),
				});
				
				if (!response.ok) {
					const errorResult = await response.json();
					throw new Error(errorResult.message || `HTTP error! status: ${response.status}`);
				}
				
				const result = await response.json();
				
				if (result.status === 'success') {
					fetchData();
					alert('Расписание успешно удалено');
				} else {
					throw new Error(result.message || 'Ошибка при удалении расписания');
				}
			} catch (err) {
				console.error('❌ Ошибка удаления расписания:', err);
				alert('Ошибка при удалении расписания: ' + err.message);
			}
		}
	};

	// Обработка выбора сотрудника для ячейки
	const handleCellClick = (zoneId, date) => {
		if (isPastDate(date)) return;
		
		const key = `${zoneId}-${date}`;
		const currentSelection = selectedCells[key];
		
		setSelectedCells({
			...selectedCells,
			[key]: currentSelection ? null : { zoneId, date, showDropdown: true }
		});
	};

	// Проверка, все ли зоны заполнены в определенный день
	const isDayComplete = (date) => {
		const schedulesForDate = schedules.filter(s => s.date.split('T')[0] === date);
		return schedulesForDate.length === zones.length;
	};

	// Получение дат недели
	const weekDates = getWeekDates();
	const groupedSchedules = groupSchedulesByZoneAndDay();

	useEffect(() => {
		fetchData();
	}, [weekOffset]);

	// Для отладки: отображение текущей серверной даты
	console.log('Серверная дата:', serverDate);
	console.log('Недельные даты:', weekDates);
	console.log('Расписания:', schedules);

	return (
		<div
			style={{
				backgroundColor: 'white',
				borderRadius: '0px',
				padding: '0px',
				margin: '0',
				width: '100%',
				overflow: 'hidden',
				minHeight: '100vh'
			}}
		>
			{/* Заголовок */}
			<div
				style={{
					backgroundColor: 'white',
					borderRadius: '0px',
					padding: '20px',
					marginBottom: '0px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
							color: '#1f2937',
							margin: 0,
							fontSize: '20px',
						}}
					>
						📅 Общее расписание
					</h1>
				</div>
			</div>

			{/* Управление неделей */}
			<div
				style={{
					backgroundColor: 'white',
					borderRadius: '0px',
					padding: '20px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
				}}
			>
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
						📋 Расписание на неделе
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
				</div>

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
							onClick={fetchData}
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
				) : (
					<div style={{ overflowX: 'auto' }}>
						<table
							style={{
								width: '100%',
								borderCollapse: 'collapse',
								minWidth: '800px',
							}}
						>
							<thead>
								<tr>
									<th
										style={{
											padding: '12px',
											border: '1px solid #e5e7eb',
											backgroundColor: '#f9fafb',
											fontWeight: 'bold',
											textAlign: 'center',
											minWidth: '120px',
										}}
									>
										Зоны
									</th>
									{weekDates.map((date, index) => (
										<th
											key={date}
											style={{
												padding: '12px',
												border: '1px solid #e5e7eb',
												backgroundColor: isPastDate(date, serverDate) ? '#e5e7eb' : (isDayComplete(date) ? '#fef9c3' : '#f9fafb'),
												fontWeight: 'bold',
												textAlign: 'center',
											}}
										>
											<div>{getDayName(date)}</div>
											<div style={{ fontSize: '14px' }}>
												{getDayNumber(date)} {getMonthName(date)}
											</div>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{zones.map(zone => (
									<tr key={zone.id}>
										<td
											style={{
												padding: '12px',
												border: '1px solid #e5e7eb',
												backgroundColor: '#f9fafb',
												fontWeight: '500',
												textAlign: 'center',
											}}
										>
											{zone.name}
										</td>
										{weekDates.map(date => {
											const schedule = groupedSchedules[zone.id]?.[date] || null;
											const cellKey = `${zone.id}-${date}`;
											const isSelected = selectedCells[cellKey]?.showDropdown;
											
											return (
												<td
													key={`${zone.id}-${date}`}
													onClick={() => !isPastDate(date, serverDate) && handleCellClick(zone.id, date)}
													style={{
														padding: '8px',
														border: '1px solid #e5e7eb',
														textAlign: 'center',
														cursor: isPastDate(date, serverDate) ? 'not-allowed' : 'pointer',
														backgroundColor: schedule ? '#d1fae5' : (isPastDate(date, serverDate) ? '#e5e7eb' : '#fefefe'),
														position: 'relative',
														opacity: isPastDate(date, serverDate) ? 0.6 : 1,
													}}
												>
													{schedule ? (
														<div>
															<div>{getWorkerName(schedule.worker_id)}</div>
															<div style={{ fontSize: '12px', color: '#6b7280' }}>
																{schedule.planned_start_time ? schedule.planned_start_time.split('T')[1].substring(0, 5) : ''} - 
																{schedule.planned_end_time ? schedule.planned_end_time.split('T')[1].substring(0, 5) : ''}
															</div>
														</div>
													) : (
														<div></div>
													)}
													
													{isSelected && (
														<div
															style={{
																position: 'absolute',
																top: '100%',
																left: '0',
																right: '0',
																backgroundColor: 'white',
																border: '1px solid #e5e7eb',
																borderRadius: '4px',
																zIndex: 1000,
																boxShadow: '0 4px 6px -1px rgba(0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
																maxHeight: '200px',
																overflowY: 'auto',
															}}
														>
															{users
																.filter(user => user.confirmed)
																.map(user => (
																	<div
																		key={user.id}
																		onClick={(e) => {
																			e.stopPropagation();
																			// Логика создания/обновления расписания для выбранного пользователя
																			handleCreateSchedule(user.id, zone.id, date);
																			// Сброс состояния выбора
																			setSelectedCells(prev => ({
																				...prev,
																				[cellKey]: null
																			}));
																		}}
																		style={{
																			padding: '8px',
																			cursor: 'pointer',
																			borderBottom: '1px solid #e5e7eb',
																			backgroundColor: '#f9fafb',
																		}}
																		onMouseEnter={(e) => {
																			e.target.style.backgroundColor = '#e5e7eb';
																		}}
																		onMouseLeave={(e) => {
																			e.target.style.backgroundColor = '#f9fafb';
																		}}
																	>
																		{user.first_name} {user.last_name || ''}
																	</div>
																))
															}
															<div
																key="empty"
																onClick={(e) => {
																	e.stopPropagation();
																	// Логика удаления расписания
																	handleDeleteScheduleForCell(zone.id, date);
																	// Сброс состояния выбора
																	setSelectedCells(prev => ({
																		...prev,
																		[cellKey]: null
																	}));
																}}
																style={{
																	padding: '8px',
																	cursor: 'pointer',
																	borderBottom: '1px solid #e5e7eb',
																	backgroundColor: '#f9fafb',
																}}
																onMouseEnter={(e) => {
																	e.target.style.backgroundColor = '#e5e7eb';
																}}
																onMouseLeave={(e) => {
																	e.target.style.backgroundColor = '#f9fafb';
																}}
															>
																Пусто
															</div>
														</div>
													)}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
};

export default AllWorkersSchedulePage;