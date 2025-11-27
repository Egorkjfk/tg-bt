import React, { useState, useEffect } from 'react';
import { API_URL, API_ENDPOINTS } from '../constants/api';

const AdminSalaryPage = ({ userData, fullWidth = false }) => {
    const [salariesData, setSalariesData] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [zones, setZones] = useState([]);

    // Получаем текущий месяц в формате YYYY-MM
    useEffect(() => {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(currentMonth);
    }, []);

    // Загрузка списка зон
    useEffect(() => {
        const fetchZones = async () => {
            try {
                const response = await fetch(API_ENDPOINTS.GET_ALL_ZONES, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.status === 'success') {
                    setZones(result.zones);
                } else {
                    throw new Error(result.message || 'Ошибка при загрузке зон');
                }
            } catch (err) {
                console.error('❌ Ошибка загрузки зон:', err);
                setError(err.message);
            }
        };

        fetchZones();
    }, []);

    // Загрузка данных о зарплатах всех сотрудников
    const fetchAllSalaries = async (month) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_URL}/get-all-salaries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    month: month,
                    admin_id: userData.id,
                    telegram_id: userData.telegram_id,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                setSalariesData(result.salaries_data);
                setTotalAmount(result.total_amount);
            } else {
                throw new Error(result.message || 'Ошибка при загрузке данных о зарплатах');
            }
        } catch (err) {
            console.error('❌ Ошибка загрузки данных о зарплатах:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Загружаем данные при изменении месяца
    useEffect(() => {
        if (selectedMonth && userData) {
            fetchAllSalaries(selectedMonth);
        }
    }, [selectedMonth, userData]);

    // Навигация по месяцам
    const handlePrevMonth = () => {
        const [year, month] = selectedMonth.split('-').map(Number);
        let newYear = year;
        let newMonth = month - 1;
        
        if (newMonth === 0) {
            newMonth = 12;
            newYear = year - 1;
        }
        
        setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    };

    const handleNextMonth = () => {
        const [year, month] = selectedMonth.split('-').map(Number);
        let newYear = year;
        let newMonth = month + 1;
        
        if (newMonth === 13) {
            newMonth = 1;
            newYear = year + 1;
        }
        
        setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    };

    const handleCurrentMonth = () => {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(currentMonth);
    };

    // Функция для получения названия зоны по ID
    const getZoneNameById = (zoneId) => {
        if (zoneId === null) {
            return 'Зона удалена';
        }
        const zone = zones.find(z => z.id === zoneId);
        return zone ? zone.name : `Зона #${zoneId}`;
    };

    // Форматирование даты
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Форматирование времени
    const formatTime = (timeString) => {
        if (!timeString) return '-';
        // Время приходит как "0000-01-01T09:00:00Z" - берем часть после T и до Z
        const timePart = timeString.split('T')[1];
        return timePart ? timePart.slice(0, 5) : '-';
    };

    // Получение названия месяца
    const getMonthName = (monthString) => {
        const [year, month] = monthString.split('-').map(Number);
        const months = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        return `${months[month - 1]} ${year}`;
    };

    // Переключение развернутого состояния пользователя
    const toggleUserDetails = (userId) => {
        setExpandedUserId(expandedUserId === userId ? null : userId);
    };

    if (!userData) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Загрузка...</h2>
            </div>
        );
    }

    return (
        <div
            style={{
                backgroundColor: fullWidth ? 'transparent' : 'white',
                borderRadius: fullWidth ? '0px' : '16px',
                padding: fullWidth ? '0px' : '20px',
                boxShadow: fullWidth ? 'none' : '0 2px 8px rgba(0,0,0.08)',
                margin: fullWidth ? '0' : '0',
                width: fullWidth ? '100%' : 'auto',
                overflow: 'hidden'
            }}
        >
            {/* Заголовок */}
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
                    💰 Зарплаты сотрудников
                </h2>
            </div>

            {/* Общая сумма к выплате */}
            <div
                style={{
                    backgroundColor: '#f0f9ff',
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: '2px solid #bae6fd',
                }}
            >
                <div style={{ fontSize: '14px', color: '#374151', marginBottom: '5px' }}>
                    Общая сумма к выплате за {getMonthName(selectedMonth)}:
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1' }}>
                    {totalAmount.toFixed(2)} ₽
                </div>
            </div>

            {/* Навигация по месяцам */}
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '20px',
                    alignItems: 'center',
                }}
            >
                <button
                    onClick={handlePrevMonth}
                    style={{
                        padding: '10px',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    ⬅️
                </button>
                
                <div
                    style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '10px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '500',
                    }}
                >
                    {selectedMonth ? getMonthName(selectedMonth) : 'Выбор месяца'}
                </div>
                
                <button
                    onClick={handleNextMonth}
                    style={{
                        padding: '10px',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    ➡️
                </button>
            </div>

            <button
                onClick={handleCurrentMonth}
                style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginBottom: '20px',
                }}
            >
                📅 Текущий месяц
            </button>

            {/* Содержимое зарплат */}
            {loading ? (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#6b7280',
                    }}
                >
                    <div>🔄 Загрузка данных о зарплатах...</div>
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
                        onClick={() => fetchAllSalaries(selectedMonth)}
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
            ) : salariesData.length > 0 ? (
                <div>
                    {/* Список сотрудников */}
                    <div style={{ marginBottom: '20px' }}>
                        {salariesData.map((salaryInfo) => (
                            <div
                                key={salaryInfo.user_info.id}
                                style={{
                                    marginBottom: '15px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    onClick={() => toggleUserDetails(salaryInfo.user_info.id)}
                                    style={{
                                        padding: '15px',
                                        backgroundColor: expandedUserId === salaryInfo.user_info.id ? '#f9fafb' : '#ffffff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                            {salaryInfo.user_info.first_name} {salaryInfo.user_info.last_name}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                            Зарплата: {salaryInfo.total_actual_salary.toFixed(2)} ₽
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '18px' }}>
                                        {expandedUserId === salaryInfo.user_info.id ? '▲' : '▼'}
                                    </div>
                                </div>
                                
                                {expandedUserId === salaryInfo.user_info.id && (
                                    <div style={{ padding: '15px', backgroundColor: '#f9fafb' }}>
                                        {/* Сводная информация */}
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '15px',
                                                marginBottom: '20px',
                                                padding: '15px',
                                                backgroundColor: '#f8fafc',
                                                borderRadius: '12px',
                                            }}
                                        >
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                                    📊 Всего смен
                                                </div>
                                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                                                    {salaryInfo.shift_count}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                                    ⏱️ Часы (план/факт)
                                                </div>
                                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                                                    {salaryInfo.total_planned_hours}h / {salaryInfo.total_actual_hours}h
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                                    💰 Зарплата (план)
                                                </div>
                                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                                                    {salaryInfo.total_planned_salary.toFixed(2)} ₽
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                                    💵 Зарплата (факт)
                                                </div>
                                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                                                    {salaryInfo.total_actual_salary.toFixed(2)} ₽
                                                </div>
                                            </div>
                                        </div>

                                        {/* Таблица смен */}
                                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            <table
                                                style={{
                                                    width: '100%',
                                                    borderCollapse: 'collapse',
                                                    fontSize: '14px',
                                                }}
                                            >
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                                                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                                                            Дата
                                                        </th>
                                                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                                                            Зона
                                                        </th>
                                                        <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                                                            План
                                                        </th>
                                                        <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                                                            Факт
                                                        </th>
                                                        <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                                                            Ставка
                                                        </th>
                                                        <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>
                                                            Зарплата
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {salaryInfo.shifts && salaryInfo.shifts.length > 0 ?
                                                        salaryInfo.shifts
                                                            .sort((a, b) => new Date(b.date) - new Date(a.date)) // Сортировка по дате от новых к старым
                                                            .map((shift, index) => (
                                                                <tr
                                                                    key={index}
                                                                    style={{
                                                                        backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                                                                        borderBottom: '1px solid #e5e7eb',
                                                                    }}
                                                                >
                                                                    <td style={{ padding: '10px' }}>
                                                                        {formatDate(shift.date)}
                                                                    </td>
                                                                    <td style={{ padding: '10px' }}>
                                                                        {getZoneNameById(shift.zone_id)}
                                                                    </td>
                                                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                                                        {shift.planned_hours}h
                                                                        <br />
                                                                        <small style={{ color: '#6b7280', fontSize: '12px' }}>
                                                                            {formatTime(shift.planned_start)}-{formatTime(shift.planned_end)}
                                                                        </small>
                                                                    </td>
                                                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                                                        {shift.actual_hours ? `${shift.actual_hours}h` : '-'}
                                                                        <br />
                                                                        {shift.actual_start && shift.actual_end ? (
                                                                            <small style={{ color: '#6b7280', fontSize: '12px' }}>
                                                                                {formatTime(shift.actual_start)}-{formatTime(shift.actual_end)}
                                                                            </small>
                                                                        ) : (
                                                                            <small style={{ color: '#ef4444', fontSize: '12px' }}>
                                                                                не заполнено
                                                                            </small>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                                                        {shift.hourly_rate} ₽/ч
                                                                    </td>
                                                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '500' }}>
                                                                        {shift.actual_salary ? (
                                                                            <span style={{ color: '#10b981' }}>
                                                                                {shift.actual_salary.toFixed(2)} ₽
                                                                            </span>
                                                                        ) : (
                                                                            <span style={{ color: '#3b82f6' }}>
                                                                                {shift.planned_salary.toFixed(2)} ₽
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        :
                                                        <tr>
                                                            <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                                                                Нет данных о сменах за этот месяц
                                                            </td>
                                                        </tr>
                                                    }
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Итоги */}
                                        <div
                                            style={{
                                                marginTop: '20px',
                                                padding: '15px',
                                                backgroundColor: '#1f2937',
                                                color: 'white',
                                                borderRadius: '12px',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                                                ИТОГО ЗА МЕСЯЦ
                                            </div>
                                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                                                {salaryInfo.total_actual_salary.toFixed(2)} ₽
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>
                                                {salaryInfo.total_planned_hours}ч план / {salaryInfo.total_actual_hours}ч факт
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#6b7280',
                    }}
                >
                    <div>📭 Нет данных о зарплатах сотрудников</div>
                    <div style={{ fontSize: '14px', marginTop: '8px' }}>
                        На выбранный месяц нет данных о сменах сотрудников
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSalaryPage;