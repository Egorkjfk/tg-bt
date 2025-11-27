import React, { useState, useEffect } from 'react'
import { API_URL, API_BASE_URL } from '../constants/api'
import { deleteZone } from '../api/zones'

const ZoneEditPage = ({ userData, zoneId, onBack }) => {
	const [zone, setZone] = useState(null)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState(null)
	
	// Форма редактирования
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		working_hours: '',
		image_path: '',
		price: ''
	})
	
	// Парсим working_hours на start_time и end_time, если они в формате "6:00 - 23:00"
	const parseWorkingHours = (workingHours) => {
		if (!workingHours) return { start_time: '', end_time: '' }
		
		const timePattern = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
		const match = workingHours.match(timePattern);
		
		if (match) {
			return {
				start_time: match[1],
				end_time: match[2]
			};
		}
		
		return { start_time: '', end_time: '' };
	};
	
	// Состояние для времени работы
	const [timeData, setTimeData] = useState({
		start_time: '',
		end_time: ''
	});
	
	// Для загрузки изображения
	const [selectedImage, setSelectedImage] = useState(null)
	const [uploadingImage, setUploadingImage] = useState(false)

	// Загрузка данных зоны
	useEffect(() => {
		const fetchZone = async () => {
			try {
				setLoading(true)
				const response = await fetch(`${API_URL}/get-allZones`, {
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				})

				if (!response.ok)
					throw new Error(`HTTP error! status: ${response.status}`)

				const result = await response.json()
				if (result.status === 'success') {
					const foundZone = result.zones.find(z => z.id === zoneId)
					if (foundZone) {
						setZone(foundZone)
						setFormData({
							name: foundZone.name || '',
							description: foundZone.description || '',
							working_hours: foundZone.working_hours || '',
							image_path: foundZone.image_path || '',
							price: foundZone.price || ''
						})
						
						// Устанавливаем начальные значения времени
						const timeValues = parseWorkingHours(foundZone.working_hours);
						setTimeData({
							start_time: timeValues.start_time,
							end_time: timeValues.end_time
						});
					} else {
						throw new Error('Зона не найдена')
					}
				} else {
					throw new Error(result.message || 'Ошибка при загрузке зоны')
				}
			} catch (err) {
				console.error('❌ Ошибка загрузки зоны:', err)
				setError(err.message)
			} finally {
				setLoading(false)
			}
		}

		if (zoneId) {
			fetchZone()
		}
	}, [zoneId])

	// Обработка изменений в форме
	const handleInputChange = (e) => {
		const { name, value } = e.target
		
		if (name === 'price') {
			// Для поля цены разрешаем только цифры и точку
			const numericValue = value.replace(/[^0-9.]/g, '');
			// Проверяем, что не более одной точки
			const parts = numericValue.split('.');
			if (parts.length > 2) {
				// Оставляем только первую точку
				const correctedValue = parts[0] + '.' + parts.slice(1).join('');
				setFormData(prev => ({
					...prev,
					[name]: correctedValue
				}));
			} else {
				setFormData(prev => ({
					...prev,
					[name]: numericValue
				}));
			}
		} else {
			setFormData(prev => ({
				...prev,
				[name]: value
			}));
		}
	}
	
	// Обработка изменений времени
	const handleTimeChange = (timeType, value) => {
		setTimeData(prev => ({
			...prev,
			[timeType]: value
	}))
	}

	// Обработка выбора изображения
	const handleImageChange = (e) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0]
			// Проверяем тип файла
			if (!file.type.match('image.*')) {
				alert('Пожалуйста, выберите изображение (jpg, png, gif)')
				return
			}
			// Проверяем размер файла (до 5MB)
			if (file.size > 5 * 1024 * 1024) {
				alert('Размер файла не должен превышать 5MB')
				return
			}
			setSelectedImage(file)
		}
	}

	// Загрузка изображения на сервер
	const uploadImage = async (file) => {
		try {
			setUploadingImage(true)
			
			// Создаем FormData для загрузки файла
			const formData = new FormData()
			formData.append('zone', file)
			formData.append('zone_id', zoneId)
			
			const response = await fetch(`${API_URL}/upload-zone-image`, {
				method: 'POST',
				body: formData,
				// Не устанавливаем Content-Type, браузер сам установит multipart/form-data
			})

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`)

			const result = await response.json()
			
			if (result.status === 'success') {
				return result.image_path
			} else {
				throw new Error(result.message || 'Ошибка при загрузке изображения')
			}
		} catch (err) {
			console.error('❌ Ошибка загрузки изображения:', err)
			throw err
		} finally {
			setUploadingImage(false)
		}
	}

	// Сохранение изменений
	const handleSave = async () => {
		try {
			// Проверка обязательных полей
			if (!formData.name.trim()) {
				alert('Пожалуйста, заполните название зоны');
				return;
			}
			
			// Валидация цены
			if (formData.price && isNaN(formData.price)) {
				alert('Цена должна быть числом')
				return
			}
			
			if (formData.price && parseFloat(formData.price) < 0) {
				alert('Цена не может быть отрицательной')
				return
			}
			
			// Проверка, что цена не пустая
			if (formData.price === '' || formData.price === null || formData.price === undefined) {
				alert('Пожалуйста, укажите цену');
				return;
			}
			
			setSaving(true)
			
			// Если выбрано новое изображение, загружаем его
			let imagePath = formData.image_path
			if (selectedImage) {
				try {
					imagePath = await uploadImage(selectedImage)
				} catch (uploadErr) {
					alert('Ошибка при загрузке изображения: ' + uploadErr.message)
					return
				}
			}
			
			
			// Объединяем время начала и окончания в формат "6:00 - 23:00"
			const workingHours = timeData.start_time && timeData.end_time
				? `${timeData.start_time} - ${timeData.end_time}`
				: formData.working_hours || ''; // Если поля времени не заполнены, используем старое значение
			
			// Подготавливаем данные для обновления
			const updates = {
				name: formData.name,
				description: formData.description,
				working_hours: workingHours,
				image_path: imagePath,
				price: formData.price ? parseFloat(formData.price) : 0
			}
			
			const response = await fetch(`${API_URL}/update-zone`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					zone_id: zoneId,
					admin_id: userData.id,
					telegram_id: userData.telegram_id,
					updates: updates,
				}),
			})

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`)
				
			const result = await response.json()

			if (result.status === 'success') {
				alert('Зона успешно обновлена!')
				// Возвращаемся к списку зон
				onBack()
			} else {
				throw new Error(result.message || 'Ошибка при обновлении зоны')
			}
		} catch (err) {
			console.error('❌ Ошибка обновления зоны:', err)
			alert('Ошибка при обновлении зоны: ' + err.message)
		} finally {
			setSaving(false)
		}
	}
	
	// Функция удаления зоны
	const handleDelete = async () => {
		if (!window.confirm('Вы уверены, что хотите удалить эту зону? Это действие нельзя отменить.')) {
			return;
		}
		
		try {
			await deleteZone(zoneId, userData);
			alert('Зона успешно удалена!');
			onBack(); // Возвращаемся к списку зон
		} catch (err) {
			console.error('❌ Ошибка удаления зоны:', err);
			alert('Ошибка при удалении зоны: ' + err.message);
		}
	}

	if (loading) {
		return (
			<div style={{ padding: '20px', textAlign: 'center' }}>
				<h2>🔄 Загрузка данных зоны...</h2>
			</div>
		)
	}

	if (error) {
		return (
			<div style={{ padding: '20px', textAlign: 'center' }}>
				<h2 style={{ color: '#e53e3e' }}>❌ Ошибка</h2>
				<p>{error}</p>
				<button
					onClick={onBack}
					style={{
						padding: '10px 20px',
						backgroundColor: '#718096',
						color: 'white',
						border: 'none',
						borderRadius: '8px',
						cursor: 'pointer',
					}}
				>
					◀ Назад
				</button>
			</div>
		)
	}

	if (!zone) {
		return (
			<div style={{ padding: '20px', textAlign: 'center' }}>
				<h2> Zone not found</h2>
				<button
					onClick={onBack}
					style={{
						padding: '10px 20px',
						backgroundColor: '#718096',
						color: 'white',
						border: 'none',
						borderRadius: '8px',
						cursor: 'pointer',
					}}
				>
					◀ Назад
				</button>
			</div>
		)
	}

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
					borderRadius: '12px',
					padding: '15px',
					marginBottom: '15px',
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
					<h2 style={{ margin: 0, flex: 1 }}>
						✏️ Редактирование зоны #{zoneId}
					</h2>
					<button
						onClick={handleDelete}
						style={{
							padding: '8px 16px',
							backgroundColor: '#e53e3e',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							cursor: 'pointer',
							fontSize: '14px',
							marginRight: '10px',
						}}
					>
						🗑️ Удалить
					</button>
					<button
						onClick={handleSave}
						disabled={saving || uploadingImage}
						style={{
							padding: '8px 16px',
							backgroundColor: saving || uploadingImage ? '#ccc' : '#38a169',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							cursor: saving || uploadingImage ? 'not-allowed' : 'pointer',
							fontSize: '14px',
						}}
					>
						{saving || uploadingImage ? '📤 Сохранение...' : '💾 Сохранить'}
					</button>
				</div>
			</div>

			{/* Форма редактирования */}
			<div
				style={{
					backgroundColor: 'white',
					borderRadius: '12px',
					padding: '15px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
				}}
			>
				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontSize: '12px',
							fontWeight: 'bold',
						}}
					>
						Название:
					</label>
					<input
						type='text'
						name='name'
						value={formData.name}
						onChange={handleInputChange}
						style={{
							width: '100%',
							padding: '8px',
							border: '1px solid #ddd',
							borderRadius: '8px',
							fontSize: '14px',
						}}
					/>
				</div>

				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontSize: '12px',
							fontWeight: 'bold',
						}}
					>
						Описание:
					</label>
					<textarea
						name='description'
						value={formData.description}
						onChange={handleInputChange}
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

				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontSize: '12px',
							fontWeight: 'bold',
						}}
					>
						Время работы:
					</label>
					<div style={{ display: 'flex', gap: '10px' }}>
						<div style={{ flex: 1 }}>
							<label style={{ display: 'block', fontSize: '12px', marginBottom: '3px' }}>С</label>
							<input
								type='time'
								value={timeData.start_time}
								onChange={(e) => handleTimeChange('start_time', e.target.value)}
								style={{
									width: '100%',
									padding: '8px',
									border: '1px solid #ddd',
									borderRadius: '8px',
									fontSize: '14px',
								}}
							/>
						</div>
						<div style={{ flex: 1 }}>
							<label style={{ display: 'block', fontSize: '12px', marginBottom: '3px' }}>До</label>
							<input
								type='time'
								value={timeData.end_time}
								onChange={(e) => handleTimeChange('end_time', e.target.value)}
								style={{
									width: '100%',
									padding: '8px',
									border: '1px solid #ddd',
									borderRadius: '8px',
									fontSize: '14px',
								}}
							/>
						</div>
					</div>
				</div>

				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontSize: '12px',
							fontWeight: 'bold',
						}}
					>
						💰 Цена (руб.):
					</label>
					<input
						type='text'
						name='price'
						value={formData.price}
						onChange={handleInputChange}
						onKeyDown={(e) => {
							// Разрешаем: Backspace, Tab, Enter, Escape, Delete, точка, минус и цифры
							if (['Backspace', 'Tab', 'Enter', 'Escape', 'Delete', '.'].includes(e.key) ||
								(e.key >= '0' && e.key <= '9')) {
								return;
							}
							// Разрешаем клавиши управления (стрелки, Home, End и т.д.)
							if (e.key.startsWith('Arrow') || ['Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
								return;
							}
							// Разрешаем комбинации с Ctrl (копирование, вырезание и т.д.)
							if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) {
								return;
							}
							// Запрещаем все остальные символы
							e.preventDefault();
						}}
						placeholder='Введите цену...'
						style={{
							width: '100%',
							padding: '8px',
							border: '1px solid #ddd',
							borderRadius: '8px',
							fontSize: '14px',
						}}
					/>
				</div>

				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontSize: '12px',
							fontWeight: 'bold',
						}}
					>
						🖼️ Изображение:
					</label>
					
					{/* Отображение текущего изображения */}
					{formData.image_path && (
						<div style={{ marginBottom: '10px' }}>
							<div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
								Текущее изображение:
							</div>
							<img
								src={`${API_BASE_URL}${formData.image_path}`}
								alt='Текущее изображение зоны'
								style={{
									maxWidth: '100%',
									maxHeight: '150px',
									borderRadius: '5px',
									border: '1px solid #e2e8f0',
								}}
							/>
						</div>
					)}
					
					{/* Поле для выбора нового изображения */}
					<input
						type='file'
						accept='image/*'
						onChange={handleImageChange}
						style={{
							width: '100%',
							padding: '8px',
							border: '1px solid #ddd',
							borderRadius: '8px',
							fontSize: '14px',
						}}
					/>
					
					{/* Индикатор загрузки изображения */}
					{uploadingImage && (
						<div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
							🔄 Загрузка изображения...
						</div>
					)}
					
					{/* Предпросмотр выбранного изображения */}
					{selectedImage && (
						<div style={{ marginTop: '10px' }}>
							<div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
								Предпросмотр нового изображения:
							</div>
							<img
								src={URL.createObjectURL(selectedImage)}
								alt='Предпросмотр'
								style={{
									maxWidth: '100%',
									maxHeight: '150px',
									borderRadius: '5px',
									border: '1px solid #e2e8f0',
								}}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default ZoneEditPage