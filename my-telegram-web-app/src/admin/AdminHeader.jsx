import React from 'react'

const AdminHeader = ({ userData }) => (
	<div
		style={{
			backgroundColor: 'white',
			borderRadius: '12px',
			padding: '15px',
			marginBottom: '20px',
			border: '2px solid #4299e1',
		}}
	>
		<h3>👤 Вы администратор</h3>
		<p>
			<strong>Имя:</strong> {userData.first_name}
		</p>
		<p>
			<strong>ID:</strong> {userData.id}
		</p>
	</div>
)

export default AdminHeader
