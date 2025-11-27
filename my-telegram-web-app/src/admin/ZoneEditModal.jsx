import React, { useState } from 'react'
import { API_BASE_URL } from '../constants/api'

const ZoneEditModal = ({ zone, onSave, onClose, isNew = false }) => {
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
	
	// Если это новая зона, устанавливаем начальные значения
	const initialZone = isNew
		? {
			name: '',
			description: '',
			working_hours: '',
			image_path: '',
			price: 0,
			start_time: '',
			end_time: ''
		}
		: {
			...zone,
			...parseWorkingHours(zone.working_hours)
		};
	
	const [editingZone, setEditingZone] = useState(initialZone);
	
	// Для загрузки изображения
	const [selectedImage, setSelectedImage] = useState(null);
	const [uploadingImage, setUploadingImage] = useState(false);
	
	// Обработка выбора изображения
	const handleImageChange = (e) => {
	if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			// Проверяем тип файла
			if (!file.type.match('image.*')) {
				alert('Пожалуйста, выберите изображение (jpg, png, gif)');
				return;
			}
			// Проверяем размер файла (до 5MB)
			if (file.size > 5 * 1024 * 1024) {
				alert('Размер файла не должен превышать 5MB');
				return;
			}
			setSelectedImage(file);
		}
	};
	
	// Загрузка изображения на сервер
	const uploadImage = async (file, zoneId) => {
	try {
			setUploadingImage(true);
			
			// Создаем FormData для загрузки файла
			const formData = new FormData();
			formData.append('zone', file);
			formData.append('zone_id', zoneId);
			
			const response = await fetch(`${API_BASE_URL}/api/upload-zone-image`, {
				method: 'POST',
				body: formData,
				// Не устанавливаем Content-Type, браузер сам установит multipart/form-data
			});

			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`);

			const result = await response.json();
			
			if (result.status === 'success') {
				return result.image_path;
			} else {
				throw new Error(result.message || 'Ошибка при загрузке изображения');
			}
		} catch (err) {
			console.error('❌ Ошибка загрузки изображения:', err);
			throw err;
		} finally {
			setUploadingImage(false);
	}
	};

	const handleSave = async () => {
		try {
			// Проверка обязательных полей
			if (!editingZone.name.trim()) {
				alert('Пожалуйста, заполните название зоны');
				return;
			}
			
			// Проверка, что цена не пустая
			if (editingZone.price === '' || editingZone.price === null || editingZone.price === undefined) {
				alert('Пожалуйста, укажите цену');
				return;
			}
			
			// Объединяем время начала и окончания в формат "6:00 - 23:00"
			const workingHours = editingZone.start_time && editingZone.end_time
				? `${editingZone.start_time} - ${editingZone.end_time}`
				: editingZone.working_hours || ''; // Если поля времени не заполнены, используем старое значение
			
			// Если выбрано новое изображение, загружаем его
			let imagePath = editingZone.image_path;
			if (selectedImage) {
				try {
					// Для новой зоны используем временное значение ID (например, 0),
					// для существующей - реальный ID
					const zoneIdForUpload = isNew ? 0 : editingZone.id;
					imagePath = await uploadImage(selectedImage, zoneIdForUpload);
				} catch (uploadErr) {
					alert('Ошибка при загрузке изображения: ' + uploadErr.message);
					return;
				}
			}
			
			const zoneData = {
				name: editingZone.name,
				description: editingZone.description,
				working_hours: workingHours,
				image_path: imagePath,
				price: editingZone.price || 0, // Устанавливаем 0 если цена пустая
			}
			
			if (isNew) {
				// Для новой зоны не передаем ID
				onSave(null, zoneData)
			} else {
				// Для существующей зоны передаем ID
				onSave(editingZone.id, zoneData)
	}
		} catch (error) {
			console.error('❌ Ошибка при сохранении:', error);
			alert('Ошибка при сохранении: ' + error.message);
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
				<h3>{isNew ? '➕ Создание новой зоны' : '✏️ Редактирование зоны'}</h3>

				<div style={{ marginBottom: '15px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontWeight: 'bold',
						}}
					>
						Название:
					</label>
					<input
						type='text'
						value={editingZone.name}
						onChange={e =>
							setEditingZone({ ...editingZone, name: e.target.value })
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
						Описание:
					</label>
					<textarea
						value={editingZone.description}
						onChange={e =>
							setEditingZone({ ...editingZone, description: e.target.value })
						}
						style={{
							width: '100%',
							padding: '8px',
							border: '1px solid #ddd',
							borderRadius: '5px',
							minHeight: '80px',
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
						Время работы:
					</label>
					<div style={{ display: 'flex', gap: '10px' }}>
						<div style={{ flex: 1 }}>
							<label style={{ display: 'block', fontSize: '12px', marginBottom: '3px' }}>С</label>
							<input
								type='time'
								value={editingZone.start_time || ''}
								onChange={e =>
									setEditingZone({ ...editingZone, start_time: e.target.value })
								}
								style={{
									width: '100%',
									padding: '8px',
									border: '1px solid #ddd',
									borderRadius: '5px',
								}}
							/>
						</div>
						<div style={{ flex: 1 }}>
							<label style={{ display: 'block', fontSize: '12px', marginBottom: '3px' }}>До</label>
							<input
								type='time'
								value={editingZone.end_time || ''}
								onChange={e =>
									setEditingZone({ ...editingZone, end_time: e.target.value })
								}
								style={{
									width: '100%',
									padding: '8px',
									border: '1px solid #ddd',
									borderRadius: '5px',
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
							fontWeight: 'bold',
						}}
					>
						🖼️ Изображение:
					</label>
					
					{/* Отображение текущего изображения */}
					{editingZone.image_path && !selectedImage && (
						<div style={{ marginBottom: '10px' }}>
							<div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
								Текущее изображение:
							</div>
							<img
								src={`${API_BASE_URL}${editingZone.image_path}`}
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
							borderRadius: '5px',
							fontSize: '14px',
						}}
					/>
					
					{/* Индикатор загрузки изображения */}
					{uploadingImage && (
						<div style={{ marginTop: '5px', fontSize: '12px', color: '#66' }}>
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

				<div style={{ marginBottom: '20px' }}>
					<label
						style={{
							display: 'block',
							marginBottom: '5px',
							fontWeight: 'bold',
						}}
					>
						💰 Цена:
					</label>
					<input
						type='text'
						step='10'
						value={editingZone.price || ''}
						onChange={e => {
							// Для поля цены разрешаем только цифры и точку
							const numericValue = e.target.value.replace(/[^0-9.]/g, '');
							// Проверяем, что не более одной точки
							const parts = numericValue.split('.');
							let correctedValue;
							if (parts.length > 2) {
								// Оставляем только первую точку
								correctedValue = parts[0] + '.' + parts.slice(1).join('');
							} else {
								correctedValue = numericValue;
							}
							
							setEditingZone({
								...editingZone,
								price: correctedValue ? parseFloat(correctedValue) || 0 : 0,
							});
						}}
						onKeyDown={(e) => {
							// Разрешаем: Backspace, Tab, Enter, Escape, Delete, точка и цифры
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
						onClick={handleSave}
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
						onClick={onClose}
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
	)
}

export default ZoneEditModal
