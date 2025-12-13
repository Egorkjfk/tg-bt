import React, { useEffect, useState, useContext, useRef } from 'react'
import { API_URL } from '../constants/api'
import { AdminMQTTContext } from '../AdminMQTT'
import BonusFineForm from './BonusFineForm'

const UsersTab = ({ userData, openSchedulePage }) => {
	const [allUsers, setAllUsers] = useState([])
	const [filteredUsers, setFilteredUsers] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

	const [filters, setFilters] = useState({
		confirmed: '',
		search: '',
	})

	const [sortConfig, setSortConfig] = useState({
		field: 'last_name',
		direction: 'asc',
	})

	const [showEditModal, setShowEditModal] = useState(false)
	const [editingUser, setEditingUser] = useState(null)
	const [showBonusFineForm, setShowBonusFineForm] = useState(false)
	const [bonusFineFormType, setBonusFineFormType] = useState(null)
	const [bonusFineFormUser, setBonusFineFormUser] = useState(null)

	const handleShowBonusForm = (user) => {
		setBonusFineFormUser(user);
		setBonusFineFormType('bonus');
		setShowBonusFineForm(true);
	};

	const handleShowFineForm = (user) => {
		setBonusFineFormUser(user);
		setBonusFineFormType('fine');
		setShowBonusFineForm(true);
	};

	const handleCloseBonusFineForm = () => {
		setShowBonusFineForm(false);
		setBonusFineFormUser(null);
		setBonusFineFormType(null);
	};

	const mqttContext = useContext(AdminMQTTContext)
const { connected, messages, isAdmin } = mqttContext || {}

	// Отладочная информация
	useEffect(() => {
	  console.log('🔧 UsersTab MQTT статус:', {
	    connected,
	    messagesCount: messages?.length,
	    isAdmin,
	    currentZoneId: mqttContext?.currentZoneId
	  });
	}, [connected, messages, isAdmin, mqttContext?.currentZoneId]);

	useEffect(() => {
		const fetchAllUsers = async () => {
			try {
				setLoading(true)
				const response = await fetch(`${API_URL}/get-allUser`, {
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				})

				if (!response.ok)
					throw new Error(`HTTP error! status: ${response.status}`)
				const result = await response.json()

				if (result.status === 'success') {
					setAllUsers(result.users || [])
					applyFiltersAndSorting(result.users || [], filters, sortConfig)
				} else {
					throw new Error(result.message || 'Ошибка при загрузке пользователей')
				}
			} catch (err) {
				console.error('❌ Ошибка загрузки пользователей:', err)
				setError(err.message)
			} finally {
				setLoading(false)
			}
		}

		fetchAllUsers()
	}, [])

	// Обрабатываем MQTT сообщения о новых пользователях (только для админов)
	useEffect(() => {
	  if (messages && messages.length > 0 && isAdmin) {
	    const lastMessage = messages[messages.length - 1];
	    
	    console.log('📨 Проверка MQTT сообщения для админа:', lastMessage);
	    
	    if (lastMessage.type === 'user_notification') {
	      console.log('🎯 Получено MQTT уведомление о новом пользователе:', lastMessage);
	      
	      const newUser = {
	        id: lastMessage.user_id,
	        telegram_id: lastMessage.telegram_id,
	        username: lastMessage.username,
	        first_name: lastMessage.first_name,
	        last_name: lastMessage.last_name || '',
	        phone_number: lastMessage.phone_number || '',
	        confirmed: lastMessage.confirmed,
	        created_at: lastMessage.created_at,
	        is_admin: false
	      };
	      
	      setAllUsers(prevUsers => {
	        const userExists = prevUsers.some(user => user.id === newUser.id);
	        if (!userExists) {
	          console.log('➕ Добавляем нового пользователя в список:', newUser);
	          const updatedUsers = [newUser, ...prevUsers];
	          applyFiltersAndSorting(updatedUsers, filters, sortConfig);
	          return updatedUsers;
	        }
	        console.log('⏩ Пользователь уже существует, пропускаем');
	        return prevUsers;
	      });
	    }
	  }
	}, [messages, filters, sortConfig, isAdmin]);

	const applyFiltersAndSorting = (
		usersToFilter = allUsers,
		currentFilters = filters,
		currentSortConfig = sortConfig
	) => {
		let filtered = [...usersToFilter]

		if (currentFilters.confirmed !== '') {
			const confirmedBool = currentFilters.confirmed === 'true'
			filtered = filtered.filter(user => user.confirmed === confirmedBool)
		}

		if (currentFilters.search) {
			const searchTerm = currentFilters.search.toLowerCase()
			filtered = filtered.filter(
				user =>
					(user.first_name &&
						user.first_name.toLowerCase().includes(searchTerm)) ||
					(user.last_name && user.last_name.toLowerCase().includes(searchTerm))
			)
		}

		if (currentSortConfig.field) {
			filtered.sort((a, b) => {
				let aValue = a[currentSortConfig.field]
				let bValue = b[currentSortConfig.field]

				if (typeof aValue === 'string') aValue = aValue.toLowerCase()
				if (typeof bValue === 'string') bValue = bValue.toLowerCase()

				if (aValue < bValue) {
					return currentSortConfig.direction === 'asc' ? -1 : 1
				}
				if (aValue > bValue) {
					return currentSortConfig.direction === 'asc' ? 1 : -1
				}
				return 0
			})
		}

		setFilteredUsers(filtered)
	}

	const handleFilterChange = (key, value) => {
		const newFilters = { ...filters, [key]: value }
		setFilters(newFilters)
		applyFiltersAndSorting(allUsers, newFilters, sortConfig)
	}

	const handleSort = field => {
		const newSortConfig = {
			field,
			direction:
				sortConfig.field === field && sortConfig.direction === 'asc'
					? 'desc'
					: 'asc',
		}
		setSortConfig(newSortConfig)
		applyFiltersAndSorting(allUsers, filters, newSortConfig)
	}

	const resetFilters = () => {
		const defaultFilters = {
			confirmed: '',
			search: '',
		}
		setFilters(defaultFilters)
		applyFiltersAndSorting(allUsers, defaultFilters, sortConfig)
	}

	const handleEditUser = user => {
		setEditingUser(user)
		setShowEditModal(true)
	}

	const handleScheduleUser = user => {
			if (openSchedulePage) {
				openSchedulePage(user);
			} else {
				window.location.hash = `schedule/${user.id}`;
			}
		}

	const updateUserConfirmed = async (userId, currentConfirmed) => {
		try {
			const response = await fetch(`${API_URL}/update-user-confirmed`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: userId,
					confirmed: !currentConfirmed,
					admin_id: userData.id,
					telegram_id: userData.telegram_id,
				}),
			})

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`)

			const result = await response.json()

			if (result.status === 'success') {
				setAllUsers(prevUsers =>
					prevUsers.map(user =>
						user.id === userId
							? { ...user, confirmed: !currentConfirmed }
							: user
					)
				)
				setFilteredUsers(prevUsers =>
					prevUsers.map(user =>
						user.id === userId
							? { ...user, confirmed: !currentConfirmed }
							: user
					)
				)
			} else {
				throw new Error(result.message || 'Ошибка при обновлении подтверждения')
			}
		} catch (err) {
			console.error('❌ Ошибка обновления подтверждения пользователя:', err)
			alert('Ошибка при обновлении подтверждения: ' + err.message)
		}
	}

	const refreshUsers = async () => {
		try {
			setLoading(true)
			const response = await fetch(`${API_URL}/get-allUser`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`)
			const result = await response.json()

			if (result.status === 'success') {
				setAllUsers(result.users || [])
				applyFiltersAndSorting(result.users || [], filters, sortConfig)
			} else {
				throw new Error(result.message || 'Ошибка при загрузке пользователей')
			}
		} catch (err) {
			console.error('❌ Ошибка загрузки пользователей:', err)
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	if (loading) {
		return (
			<div style={{ textAlign: 'center', padding: '20px' }}>
				<h2>🔄 Загрузка списка пользователей...</h2>
			</div>
		)
	}

	if (error) {
		return (
			<div style={{ textAlign: 'center', padding: '20px' }}>
				<h2 style={{ color: '#e53e3e' }}>❌ Ошибка</h2>
				<p>{error}</p>
			</div>
		)
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
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
				<h3 style={{ margin: 0 }}>
					📊 Все пользователи ({filteredUsers.length} из {allUsers.length})
					{connected && (
						<span style={{ fontSize: '12px', color: '#38a169', marginLeft: '10px' }}>
							🔴 Live {isAdmin ? '(Admin)' : `(Zone ${mqttContext?.currentZoneId})`}
						</span>
					)}
				</h3>
				<button
					onClick={refreshUsers}
					style={{
						padding: '8px 16px',
						backgroundColor: '#4299e1',
						color: 'white',
						border: 'none',
						borderRadius: '8px',
						cursor: 'pointer',
						fontSize: '14px',
					}}
				>
					🔄 Обновить
				</button>
			</div>

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
						🔍 Поиск по имени/фамилии
					</label>
					<input
						type='text'
						value={filters.search}
						onChange={e => handleFilterChange('search', e.target.value)}
						placeholder='Введите имя или фамилию...'
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
						✅ Статус подтверждения
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
						<option value='true'>Подтвержденные</option>
						<option value='false'>Неподтвержденные</option>
					</select>
				</div>
		
			
				
				
			</div>

			{filteredUsers.length === 0 ? (
				<p style={{ textAlign: 'center', color: '#666' }}>
					Пользователи не найдены
				</p>
			) : (
				<div style={{ overflowY: 'visible' }}>
					{filteredUsers.map((user, index) => (
						<UserCard
							key={user.id}
							user={user}
							index={index}
							onEdit={handleEditUser}
							onSchedule={handleScheduleUser}
							onUpdateConfirmed={updateUserConfirmed}
							openSchedulePage={openSchedulePage}
							onShowBonusForm={handleShowBonusForm}
							onShowFineForm={handleShowFineForm}
							isLast={index === filteredUsers.length - 1}
						/>
					))}
					
					{/* Компонент формы добавления премии/штрафа */}
					{showBonusFineForm && bonusFineFormUser && bonusFineFormType && (
						<BonusFineForm
							isOpen={showBonusFineForm}
							onClose={handleCloseBonusFineForm}
							onSubmit={(formData) => {
								// Можно добавить логику обновления списка пользователей или других данных
								handleCloseBonusFineForm();
							}}
							type={bonusFineFormType}
							user={bonusFineFormUser}
							userData={userData}
						/>
					)}
				</div>
			)}

			{showEditModal && editingUser && (
				<EditUserModal
					user={editingUser}
					onSave={updatedUser => {
						setAllUsers(prevUsers =>
							prevUsers.map(user =>
								user.id === updatedUser.id ? updatedUser : user
							)
						)
						setFilteredUsers(prevUsers =>
							prevUsers.map(user =>
								user.id === updatedUser.id ? updatedUser : user
							)
						)
						setShowEditModal(false)
						setEditingUser(null)
					}}
					onClose={() => {
						setShowEditModal(false)
						setEditingUser(null)
					}}
					userData={userData}
				/>
			)}
		</div>
	)
}
const UserCard = ({ user, index, onEdit, onSchedule, onUpdateConfirmed, openSchedulePage, onShowBonusForm, onShowFineForm, isLast }) => {
	const [showBonusFineMenu, setShowBonusFineMenu] = useState(false);
	const [menuPosition, setMenuPosition] = useState('bottom'); // 'bottom' или 'top'
	const timeoutRef = useRef(null);

	// Определяем позицию меню для последнего пользователя
	useEffect(() => {
		if (isLast) {
			setMenuPosition('top');
		} else {
			setMenuPosition('bottom');
		}
	}, [isLast]);

	const handleMouseEnter = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		setShowBonusFineMenu(true);
	};

	const handleMouseLeave = () => {
		// Задержка перед скрытием меню
		timeoutRef.current = setTimeout(() => {
			setShowBonusFineMenu(false);
		}, 200); // 300ms = 0.3 секунды
	};

	const handleMenuEnter = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
	};

	const handleMenuLeave = () => {
		timeoutRef.current = setTimeout(() => {
			setShowBonusFineMenu(false);
		}, 300);
	};

	// Очищаем таймер при размонтировании
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return (
		<div
			style={{
				padding: '12px',
				border: '1px solid #e2e8f0',
				borderRadius: '8px',
				marginBottom: '10px',
				backgroundColor: index % 2 === 0 ? '#f7fafc' : 'white',
				position: 'relative'
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between' }}>
				<div>
					<strong>
						{user.first_name} {user.last_name || ''}
					</strong>
					{user.is_admin && (
						<span
							style={{
								marginLeft: '8px',
								backgroundColor: '#4299e1',
								color: 'white',
								padding: '2px 6px',
								borderRadius: '4px',
								fontSize: '12px',
							}}
						>
							ADMIN
						</span>
					)}
				</div>
				<div style={{ fontSize: '12px', color: '#666' }}>ID: {user.id}</div>
			</div>
			<div style={{ fontSize: '14px', color: '#66', marginTop: '5px' }}>
				@{user.username || 'нет юзернейма'} • {user.telegram_id}
			</div>
			<div style={{ fontSize: '14px', marginTop: '5px' }}>
				📞 {user.phone_number || 'нет телефона'}
			</div>
			<div style={{ fontSize: '12px', color: '#66', marginTop: '5px' }}>
				Статус:{' '}
				<span
					style={{
						cursor: 'pointer',
						textDecoration: 'underline',
					}}
					onClick={() => onUpdateConfirmed(user.id, user.confirmed)}
					title='Нажмите для изменения статуса'
				>
					{user.confirmed ? (
						<span style={{ color: '#38a169' }}>✅ Подтвержден</span>
					) : (
						<span style={{ color: '#e53e3e' }}>❌ Не подтвержден</span>
					)}
				</span>
			</div>
			<div style={{ marginTop: '10px', display: 'flex', gap: '10px', position: 'relative' }}>
				<button
					onClick={() => onEdit(user)}
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
					onClick={() => {
						if (openSchedulePage) {
							openSchedulePage(user);
						} else {
							onSchedule(user);
						}
					}}
					style={{
						padding: '5px 10px',
						backgroundColor: '#38a169',
						color: 'white',
						border: 'none',
						borderRadius: '5px',
						cursor: 'pointer',
					}}
				>
					📅 Расписание
				</button>
				
				{/* Выпадающий список Премия/Штраф */}
				<div 
					style={{ 
						position: 'relative',
						display: 'inline-block'
					}}
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
				>
					<button
						style={{
							padding: '5px 10px',
							backgroundColor: '#805ad5',
							color: 'white',
							border: 'none',
							borderRadius: '5px',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							gap: '5px'
						}}
					>
						🎁 Премия/Штраф
						<span style={{ fontSize: '12px' }}>▼</span>
					</button>
					
					{/* Выпадающее меню */}
					{showBonusFineMenu && (
						<div
							style={{
								position: 'absolute',
								[menuPosition === 'bottom' ? 'top' : 'bottom']: '100%',
								left: 0,
								backgroundColor: 'white',
								border: '1px solid #e2e8f0',
								borderRadius: '8px',
								boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
								zIndex: 1000,
								minWidth: '160px',
								marginTop: menuPosition === 'bottom' ? '5px' : '0',
								marginBottom: menuPosition === 'top' ? '5px' : '0'
							}}
							onMouseEnter={handleMenuEnter}
							onMouseLeave={handleMenuLeave}
						>
							<button
								onClick={() => onShowBonusForm(user)}
								style={{
									width: '100%',
									padding: '10px',
									border: 'none',
									backgroundColor: '#38a169',
									color: 'white',
									borderRadius: '8px 8px 0 0',
									cursor: 'pointer',
									textAlign: 'left',
									fontSize: '14px',
									display: 'flex',
									alignItems: 'center',
									gap: '8px'
								}}
							>
								✅ Добавить премию
							</button>
							<button
								onClick={() => onShowFineForm(user)}
								style={{
									width: '100%',
									padding: '10px',
									border: 'none',
									backgroundColor: '#e53e3e',
									color: 'white',
									borderRadius: '0 0 8px 8px',
									cursor: 'pointer',
									textAlign: 'left',
									fontSize: '14px',
									display: 'flex',
									alignItems: 'center',
									gap: '8px'
								}}
							>
								❌ Добавить штраф
							</button>
						</div>
					)}
				</div>

				{user.username && (
					<a
						href={`https://t.me/${user.username}`}
						target='_blank'
						rel='noopener noreferrer'
						style={{
							padding: '5px 10px',
							backgroundColor: '#6441a5',
							color: 'white',
							border: 'none',
							borderRadius: '5px',
							cursor: 'pointer',
							textDecoration: 'none',
							display: 'inline-block',
							textAlign: 'center',
						}}
					>
						💬 Чат
					</a>
				)}
			</div>
		</div>
	);
}


const EditUserModal = ({ user, onSave, onClose, userData }) => {
	const [editedUser, setEditedUser] = useState({ ...user })
	const [isDeleting, setIsDeleting] = useState(false)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

	const handleSave = async () => {
		try {
			const response = await fetch(`${API_URL}/update-user-confirmed`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: editedUser.id,
					confirmed: editedUser.confirmed,
					admin_id: userData.id,
					telegram_id: userData.telegram_id,
				}),
			})

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`)

			const result = await response.json()

			if (result.status === 'success') {
				onSave(editedUser)
			} else {
				throw new Error(result.message || 'Ошибка при обновлении пользователя')
			}
		} catch (err) {
			console.error('❌ Ошибка обновления пользователя:', err)
			alert('Ошибка при обновлении пользователя: ' + err.message)
		}
	}

	const handleDeleteUser = async () => {
		// Не позволяем удалять администраторов
		if (user.is_admin) {
			alert('❌ Нельзя удалить администратора!')
			return
		}

		// Проверяем, что администратор не пытается удалить самого себя
		if (user.id === userData.id) {
			alert('❌ Администратор не может удалить самого себя!')
			return
		}

		if (!window.confirm(`Вы уверены, что хотите удалить пользователя ${user.first_name} ${user.last_name || ''}?\n\nЭто действие нельзя будет отменить!`)) {
			return
		}

		try {
			setIsDeleting(true)
			const response = await fetch(`${API_URL}/delete-user`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: user.id,
					admin_id: userData.id,
					telegram_id: userData.telegram_id,
				}),
			})

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`)

			const result = await response.json()

			if (result.status === 'success') {
				alert(`✅ ${result.message}`)
				onClose() // Закрываем модальное окно
				// Можно добавить callback для обновления списка пользователей
				window.location.reload() // Или перезагрузить страницу
			} else {
				throw new Error(result.message || 'Ошибка при удалении пользователя')
			}
		} catch (err) {
			console.error('❌ Ошибка удаления пользователя:', err)
			alert('Ошибка при удалении пользователя: ' + err.message)
		} finally {
			setIsDeleting(false)
		}
	}

	return (
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
				<h3>✏️ Редактирование пользователя</h3>
				
				{/* Предупреждение об удалении администратора */}
				{user.is_admin && (
					<div style={{
						padding: '10px',
						marginBottom: '15px',
						backgroundColor: '#fed7d7',
						border: '1px solid #fc8181',
						borderRadius: '5px',
						color: '#c53030'
					}}>
						⚠️ Этот пользователь является администратором. Удаление администраторов запрещено.
					</div>
				)}
				
				{/* Предупреждение о попытке удалить себя */}
				{user.id === userData.id && (
					<div style={{
						padding: '10px',
						marginBottom: '15px',
						backgroundColor: '#fed7d7',
						border: '1px solid #fc8181',
						borderRadius: '5px',
						color: '#c53030'
					}}>
						⚠️ Вы не можете удалить самого себя.
					</div>
				)}

				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontWeight: 'bold',
						}}
					>
						ID:
					</label>
					<div
						style={{
							padding: '8px',
							border: '1px solid #ddd',
							borderRadius: '5px',
							backgroundColor: '#f5f5f5',
						}}
					>
						{editedUser.id}
					</div>
				</div>

				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontWeight: 'bold',
						}}
					>
						Telegram ID:
					</label>
					<div
						style={{
							padding: '8px',
							border: '1px solid #ddd',
							borderRadius: '5px',
							backgroundColor: '#f5f5f5',
						}}
					>
						{editedUser.telegram_id}
					</div>
				</div>

				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontWeight: 'bold',
						}}
					>
						Имя:
					</label>
					<input
						type='text'
						value={editedUser.first_name}
						onChange={e =>
							setEditedUser({ ...editedUser, first_name: e.target.value })
						}
						style={{
							width: '100%',
							padding: '8px',
							border: '1px solid #ddd',
							borderRadius: '5px',
						}}
					/>
				</div>

				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontWeight: 'bold',
						}}
					>
						Фамилия:
					</label>
					<input
						type='text'
						value={editedUser.last_name || ''}
						onChange={e =>
							setEditedUser({ ...editedUser, last_name: e.target.value })
						}
						style={{
							width: '100%',
							padding: '8px',
							border: '1px solid #ddd',
							borderRadius: '5px',
						}}
					/>
				</div>

				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontWeight: 'bold',
						}}
					>
						Юзернейм:
					</label>
					<input
						type='text'
						value={editedUser.username || ''}
						onChange={e =>
							setEditedUser({ ...editedUser, username: e.target.value })
						}
						style={{
							width: '100%',
							padding: '8px',
							border: '1px solid #ddd',
							borderRadius: '5px',
						}}
					/>
				</div>

				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontWeight: 'bold',
						}}
					>
						Телефон:
					</label>
					<input
						type='text'
						value={editedUser.phone_number || ''}
						onChange={e =>
							setEditedUser({ ...editedUser, phone_number: e.target.value })
						}
						style={{
							width: '100%',
							padding: '8px',
							border: '1px solid #ddd',
							borderRadius: '5px',
						}}
					/>
				</div>

				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontWeight: 'bold',
						}}
					>
						Статус подтверждения:
					</label>
					<select
						value={editedUser.confirmed}
						onChange={e =>
							setEditedUser({
								...editedUser,
								confirmed: e.target.value === 'true',
							})
						}
						style={{
							width: '100%',
							padding: '8px',
							border: '1px solid #ddd',
							borderRadius: '5px',
						}}
					>
						<option value={true}>Подтвержден</option>
						<option value={false}>Не подтвержден</option>
					</select>
				</div>

				<div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
					<button
						onClick={handleSave}
						style={{
							padding: '10px 20px',
							backgroundColor: '#38a169',
							color: 'white',
							border: 'none',
							borderRadius: '5px',
							cursor: 'pointer',
							flex: 1,
							minWidth: '120px',
						}}
					>
						💾 Сохранить
					</button>
					
					{/* Кнопка удаления - показываем только если это не администратор и не сам себя */}
					{!user.is_admin && user.id !== userData.id && (
						<button
							onClick={handleDeleteUser}
							disabled={isDeleting}
							style={{
								padding: '10px 20px',
								backgroundColor: isDeleting ? '#718096' : '#e53e3e',
								color: 'white',
								border: 'none',
								borderRadius: '5px',
								cursor: isDeleting ? 'not-allowed' : 'pointer',
								flex: 1,
								minWidth: '120px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								gap: '5px'
							}}
						>
							{isDeleting ? (
								<>
									<span>⏳</span> Удаление...
								</>
							) : (
								<>
									🗑️ Удалить
								</>
							)}
						</button>
					)}
					
					<button
						onClick={onClose}
						style={{
							padding: '10px 20px',
							backgroundColor: '#718096',
							color: 'white',
							border: 'none',
							borderRadius: '5px',
							cursor: 'pointer',
							flex: 1,
							minWidth: '120px',
						}}
					>
						❌ Отмена
					</button>
				</div>
				
				{/* Предупреждение о последствиях удаления */}
				{!user.is_admin && user.id !== userData.id && (
					<div style={{
						marginTop: '15px',
						padding: '10px',
						backgroundColor: '#fffaf0',
						border: '1px solid #dd6b20',
						borderRadius: '5px',
						color: '#c05621',
						fontSize: '12px'
					}}>
						⚠️ При удалении пользователя также будут удалены:
						<ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
							<li>Все записи его расписания</li>
							<li>Все назначенные штрафы</li>
							<li>Все назначенные премии</li>
							<li>Файлы фото, если они есть</li>
						</ul>
					</div>
				)}
			</div>
		</div>
	)
}


export default UsersTab