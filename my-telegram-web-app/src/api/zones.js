import { API_BASE_URL } from '../constants/api'

export const createZone = async (zoneData, userData) => {
  const response = await fetch(`${API_BASE_URL}/api/create-zone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: zoneData.name,
      description: zoneData.description,
      working_hours: zoneData.working_hours,
      image_path: zoneData.image_path,
      price: zoneData.price,
      admin_id: userData.id,
      telegram_id: userData.telegram_id,
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  if (result.status !== 'success') {
    throw new Error(result.message || 'Ошибка при создании зоны')
  }

  return result
}

export const deleteZone = async (zoneId, userData) => {
  const response = await fetch(`${API_BASE_URL}/api/drop-zone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      zone_id: zoneId,
      admin_id: userData.id,
      telegram_id: userData.telegram_id,
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  if (result.status !== 'success') {
    throw new Error(result.message || 'Ошибка при удалении зоны')
  }

  return result
}

export const updateZone = async (zoneId, zoneData, userData) => {
  const response = await fetch(`${API_BASE_URL}/api/update-zone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      zone_id: zoneId,
      admin_id: userData.id,
      telegram_id: userData.telegram_id,
      updates: zoneData,
    }),
  })

 if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  if (result.status !== 'success') {
    throw new Error(result.message || 'Ошибка при обновлении зоны')
  }

  return result
}