import React, { useState } from 'react';
import { API_URL } from './constants/api';

const UserProfileSection = ({ userData, onProfileUpdate, fullWidth = false }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editData, setEditData] = useState({
		first_name: userData.first_name || '',
	last_name: userData.last_name || '',
	phone_number: userData.phone_number || ''
	});

	const handleEditClick = () => {
		setEditData({
			first_name: userData.first_name || '',
			last_name: userData.last_name || '',
			phone_number: userData.phone_number || ''
		});
		setIsEditing(true);
	};

	const handleSave = async () => {
	try {
			const response = await fetch(`${API_URL}/update-phone`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: userData.id,
					telegram_id: userData.telegram_id,
					phone_number: editData.phone_number
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();

			if (result.status === 'success') {
				// Обновляем данные пользователя
				onProfileUpdate({
					...userData,
					first_name: editData.first_name,
					last_name: editData.last_name,
					phone_number: editData.phone_number
				});
				setIsEditing(false);
			} else {
				throw new Error(result.message || 'Ошибка при обновлении профиля');
			}
	} catch (err) {
			console.error('❌ Ошибка обновления профиля:', err);
			alert('Ошибка при обновлении профиля: ' + err.message);
		}
	};

	const handleCancel = () => {
	setIsEditing(false);
	};

	const handleChange = (field, value) => {
	setEditData(prev => ({
			...prev,
			[field]: value
		}));
	};

	return (
		<div
			style={{
				backgroundColor: 'white',
				borderRadius: fullWidth ? '0px' : '16px',
				padding: fullWidth ? '15px' : '20px',
				marginBottom: '15px',
				boxShadow: fullWidth ? 'none' : '0 2px 8px rgba(0,0,0.08)',
				margin: fullWidth ? '0' : '0 0 15px 0',
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
				<h1
					style={{
						color: '#059669',
						margin: 0,
						fontSize: '20px',
					}}
				>
					👋 Профиль
				</h1>
				<button
					onClick={handleEditClick}
					style={{
						padding: '8px 12px',
						backgroundColor: '#4299e1',
						color: 'white',
						border: 'none',
						borderRadius: '8px',
						cursor: 'pointer',
					}}
				>
					✏️
				</button>
			</div>

			{isEditing ? (
				<div style={{ marginBottom: '15px' }}>
					<div style={{ marginBottom: '10px' }}>
						<label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
							Имя:
						</label>
						<input
							type="text"
							value={editData.first_name}
							onChange={(e) => handleChange('first_name', e.target.value)}
							style={{
								width: '100%',
								padding: '8px',
								border: '1px solid #ddd',
								borderRadius: '5px',
								fontSize: '14px',
							}}
						/>
					</div>
					<div style={{ marginBottom: '10px' }}>
						<label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
							Фамилия:
						</label>
						<input
							type="text"
							value={editData.last_name}
							onChange={(e) => handleChange('last_name', e.target.value)}
							style={{
								width: '100%',
								padding: '8px',
								border: '1px solid #ddd',
								borderRadius: '5px',
								fontSize: '14px',
							}}
						/>
					</div>
					<div style={{ marginBottom: '15px' }}>
						<label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
							Телефон:
						</label>
						<input
							type="tel"
							value={editData.phone_number}
							onChange={(e) => handleChange('phone_number', e.target.value)}
							style={{
								width: '100%',
								padding: '8px',
								border: '1px solid #ddd',
								borderRadius: '5px',
								fontSize: '14px',
							}}
						/>
					</div>
					<div style={{ display: 'flex', gap: '10px' }}>
						<button
							onClick={handleSave}
							style={{
								flex: 1,
								padding: '10px',
								backgroundColor: '#38a169',
								color: 'white',
								border: 'none',
								borderRadius: '5px',
								cursor: 'pointer',
							}}
						>
							Сохранить
						</button>
						<button
							onClick={handleCancel}
							style={{
								flex: 1,
								padding: '10px',
								backgroundColor: '#e53e3e',
								color: 'white',
								border: 'none',
								borderRadius: '5px',
								cursor: 'pointer',
							}}
						>
							Отмена
						</button>
					</div>
				</div>
			) : (
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
						<span style={{ fontWeight: '500' }}>{userData.first_name}</span>
					</div>
					{userData.last_name && (
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span>📋 Фамилия:</span>
							<span style={{ fontWeight: '500' }}>{userData.last_name}</span>
						</div>
					)}
					{userData.phone_number && (
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span>📞 Телефон:</span>
							<span style={{ fontWeight: '500' }}>{userData.phone_number}</span>
						</div>
					)}
					<div style={{ display: 'flex', justifyContent: 'space-between' }}>
						<span>🆔 ID:</span>
						<span style={{ fontWeight: '500' }}>{userData.id}</span>
					</div>
				</div>
			)}

			<div
				style={{
					marginTop: '15px',
					padding: '12px',
					backgroundColor: '#d1fae5',
					borderRadius: '10px',
					color: '#065f46',
					fontSize: '14px',
					fontWeight: '500',
					textAlign: 'center',
				}}
			>
				✅ Аккаунт подтвержден
			</div>
		</div>
	);
};

export default UserProfileSection;