export const API_URL = 'https://fly-park.ru:7777/api'
export const getBaseUrl = () => {
	// юрл сайта - реакт этого сайта
	//return 'https://egor-e6b81.web.app'
	return 'https://fly-park.ru:3000'
}

export const API_BASE_URL =
	process.env.REACT_APP_API_URL || 'https://fly-park.ru:7777'
export const API_ENDPOINTS = {
	CALCULATE_SALARY: `${API_BASE_URL}/api/calculate-salary`,
	UPDATE_PHONE: `${API_BASE_URL}/api/update-phone`,
	GET_USER: `${API_BASE_URL}/api/get-user`,
	GET_ALL_USER: `${API_BASE_URL}/api/get-allUser`,
	GET_ALL_ZONES: `${API_BASE_URL}/api/get-allZones`,
	UPDATE_ZONE: `${API_BASE_URL}/api/update-zone`,
	GET_CHECKLISTS: `${API_BASE_URL}/api/get-checklists`,
	UPDATE_CHECKLIST: `${API_BASE_URL}/api/update-checklist`,
	UPDATE_CHECKLIST_CONFIRMED: `${API_BASE_URL}/api/update-checklist-confirmed`,
	CREATE_CHECKLIST: `${API_BASE_URL}/api/create-checklist`,
	CREATE_SCHEDULE: `${API_BASE_URL}/api/create-schedule`,
	UPDATE_ACTUAL_START_TIME: `${API_BASE_URL}/api/update-actual-start-time`,
	UPDATE_ACTUAL_END_TIME: `${API_BASE_URL}/api/update-actual-end-time`,
	GET_WORKER_WEEKLY_SCHEDULE: `${API_BASE_URL}/api/get-worker-weekly-schedule`,
	GET_ALL_WORKERS_WEEKLY_SCHEDULE: `${API_BASE_URL}/api/get-all-workers-weekly-schedule`,
	UPDATE_USER_CONFIRMED: `${API_BASE_URL}/api/update-user-confirmed`,
	UPLOAD_ZONE_IMAGE: `${API_BASE_URL}/api/upload-zone-image`,
	CREATE_ZONE: `${API_BASE_URL}/api/create-zone`,
	GET_WORKER_CHECKLISTS: `${API_BASE_URL}/api/get-worker-checklists`,
	GET_CURRENT_DATE: `${API_BASE_URL}/api/get-current-date`,
	UPLOAD_CHECKLIST_PHOTO: `${API_BASE_URL}/api/upload-checklist-photo`,
	ADD_CHECKLIST_PHOTO: `${API_BASE_URL}/api/add-checklist-photo`,
	DROP_ZONE: `${API_BASE_URL}/api/drop-zone`,
	DELETE_SCHEDULE: `${API_BASE_URL}/api/delete-schedule`,
	UPDATE_CHECKLIST_DESCRIPTION: `${API_BASE_URL}/api/update-checklist-description`,
	DELETE_CHECKLIST: `${API_BASE_URL}/api/delete-checklist`,
	UPDATE_AUTO_CHECKLIST: `${API_BASE_URL}/api/update-auto-checklist`,

	UPDATE_CHECKLIST_STATUS: `${API_BASE_URL}/api/update-checklist-status`,
	DROP_USER: `${API_BASE_URL}/api/delete-user`,

	DELETE_CHECKLISTS: `${API_BASE_URL}/api/delete-checklists`,

	// Шаблоны штрафов
	GET_ALL_FINE_TEMPLATES: `${API_BASE_URL}/api/get-all-fine-templates`,
	CREATE_FINE_TEMPLATE: `${API_BASE_URL}/api/create-fine-template`,
	DELETE_FINE_TEMPLATE: `${API_BASE_URL}/api/delete-fine-template`,

	// Шаблоны премий
	GET_ALL_BONUS_TEMPLATES: `${API_BASE_URL}/api/get-all-bonus-templates`,
	CREATE_BONUS_TEMPLATE: `${API_BASE_URL}/api/create-bonus-template`,
	DELETE_BONUS_TEMPLATE: `${API_BASE_URL}/api/delete-bonus-template`,

	// Премии пользователей
	GET_USER_BONUSES: `${API_BASE_URL}/api/get-user-bonuses`,
	CREATE_BONUS: `${API_BASE_URL}/api/create-bonus`,
	DELETE_BONUS: `${API_BASE_URL}/api/delete-bonus`,

	// Штрафы пользователей
	GET_USER_FINES: `${API_BASE_URL}/api/get-user-fines`,
	CREATE_FINE: `${API_BASE_URL}/api/create-fine`,
	DELETE_FINE: `${API_BASE_URL}/api/delete-fine`,
}
