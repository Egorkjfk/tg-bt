import React, { useState, useEffect } from 'react';
import { API_URL, API_ENDPOINTS } from '../constants/api';

const AdminSalaryPage = ({ userData, fullWidth = false }) => {
    const [salariesData, setSalariesData] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [zones, setZones] = useState([]);
    const [deletingItems, setDeletingItems] = useState({ bonuses: [], fines: [] });

    // Добавь этот useEffect вместо удаленного:
    useEffect(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
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
    const fetchAllSalaries = async (startDate, endDate) => {
    try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/get-all-salaries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_date: startDate,
                end_date: endDate,
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
        if (startDate && endDate && userData) {
            fetchAllSalaries(startDate, endDate);
        }
    }, [startDate, endDate, userData]);

    // Удаление премии
    const handleDeleteBonus = async (bonusId, userId) => {
        try {
            setDeletingItems(prev => ({
                ...prev,
                bonuses: [...prev.bonuses, bonusId]
            }));

            const response = await fetch(API_ENDPOINTS.DELETE_BONUS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bonus_id: bonusId,
                    admin_id: userData.id,
                    telegram_id: userData.telegram_id,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                // Обновляем данные
                fetchAllSalaries(startDate, endDate);
            } else {
                throw new Error(result.message || 'Ошибка при удалении премии');
            }
        } catch (err) {
            console.error('❌ Ошибка удаления премии:', err);
            setError(err.message);
        } finally {
            setDeletingItems(prev => ({
                ...prev,
                bonuses: prev.bonuses.filter(id => id !== bonusId)
            }));
        }
    };

    // Удаление штрафа
    const handleDeleteFine = async (fineId, userId) => {
        try {
            setDeletingItems(prev => ({
                ...prev,
                fines: [...prev.fines, fineId]
            }));

            const response = await fetch(API_ENDPOINTS.DELETE_FINE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fine_id: fineId,
                    admin_id: userData.id,
                    telegram_id: userData.telegram_id,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                // Обновляем данные
                fetchAllSalaries(startDate, endDate);
            } else {
                throw new Error(result.message || 'Ошибка при удалении штрафа');
            }
        } catch (err) {
            console.error('❌ Ошибка удаления штрафа:', err);
            setError(err.message);
        } finally {
            setDeletingItems(prev => ({
                ...prev,
                fines: prev.fines.filter(id => id !== fineId)
            }));
        }
    };
    const validateDates = () => {
        if (!startDate || !endDate) return false;
        const start = new Date(startDate);
        const end = new Date(endDate);
        return start <= end;
    };

    const handleCurrentMonth = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const newStartDate = firstDay.toISOString().split('T')[0];
        const newEndDate = lastDay.toISOString().split('T')[0];
        
        setStartDate(newStartDate);
        setEndDate(newEndDate);
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
        const timePart = timeString.split('T')[1];
        return timePart ? timePart.slice(0, 5) : '-';
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
                    Общая сумма к выплате за период:
                </div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#0369a1', marginBottom: '8px' }}>
                    {startDate} — {endDate}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1' }}>
                    {totalAmount.toFixed(2)} Баллов
                </div>
            </div>

            {/* Блок выбора дат */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '15px',
                    marginBottom: '20px',
                }}
            >
                <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                        Дата начала
                    </div>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                            setStartDate(e.target.value);
                            if (endDate) fetchAllSalaries(e.target.value, endDate);
                        }}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                        }}
                    />
                </div>
                <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                        Дата окончания
                    </div>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                            setEndDate(e.target.value);
                            if (startDate) fetchAllSalaries(startDate, e.target.value);
                        }}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                        }}
                    />
                </div>
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
                        onClick={() => fetchAllSalaries(startDate, endDate)}
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
                                        Зарплата: {salaryInfo.final_salary.toFixed(2)} Баллов
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
                                                {salaryInfo.total_planned_hours}h / {salaryInfo.total_actual_hours || 0}h
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                                💰 Зарплата (план)
                                            </div>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                                                {salaryInfo.total_planned_salary.toFixed(2)} Баллов
                                            </div>
                                        </div>
                                        {/* ИСПРАВЛЕНО: Убрано total_actual_salary, так как его больше нет */}
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                                📋 ЗП по часам
                                            </div>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                                                {salaryInfo.total_actual_salary.toFixed(2)} Баллов
                                            </div>
                                        </div>
                                    </div>

                                        {/* Штрафы */}
                                        {salaryInfo.fines && salaryInfo.fines.length > 0 && (
                                            <div
                                                style={{
                                                    marginBottom: '20px',
                                                    border: '1px solid #fee2e2',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        padding: '12px 15px',
                                                        backgroundColor: '#fef2f2',
                                                        borderBottom: '1px solid #fee2e2',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ color: '#dc2626', fontSize: '16px' }}>⚠️</span>
                                                        <span style={{ fontWeight: '600', color: '#dc2626' }}>
                                                            Штрафы
                                                        </span>
                                                    </div>
                                                    <div style={{ fontWeight: 'bold', color: '#dc2626' }}>
                                                        -{salaryInfo.total_fines.toFixed(2)} Баллов
                                                    </div>
                                                </div>
                                                <div style={{ backgroundColor: 'white' }}>
                                                    {salaryInfo.fines.map((fine, index) => (
                                                        <div
                                                            key={fine.id}
                                                            style={{
                                                                padding: '12px 15px',
                                                                borderBottom: index < salaryInfo.fines.length - 1 ? '1px solid #f3f4f6' : 'none',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: '500', color: '#1f2937' }}>
                                                                    {fine.name}
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                                    {fine.date}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ fontWeight: '600', color: '#dc2626' }}>
                                                                    -{fine.price.toFixed(2)} Баллов
                                                                </div>
                                                                <button
                                                                    onClick={() => handleDeleteFine(fine.id, salaryInfo.user_info.id)}
                                                                    disabled={deletingItems.fines.includes(fine.id)}
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        backgroundColor: deletingItems.fines.includes(fine.id) ? '#9ca3af' : '#ef4444',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        cursor: deletingItems.fines.includes(fine.id) ? 'not-allowed' : 'pointer',
                                                                        fontSize: '12px',
                                                                        fontWeight: '500',
                                                                    }}
                                                                >
                                                                    {deletingItems.fines.includes(fine.id) ? '...' : '✕'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Премии */}
                                        {salaryInfo.bonuses && salaryInfo.bonuses.length > 0 && (
                                            <div
                                                style={{
                                                    marginBottom: '20px',
                                                    border: '1px solid #dcfce7',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        padding: '12px 15px',
                                                        backgroundColor: '#f0fdf4',
                                                        borderBottom: '1px solid #dcfce7',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ color: '#16a34a', fontSize: '16px' }}>🎁</span>
                                                        <span style={{ fontWeight: '600', color: '#16a34a' }}>
                                                            Премии
                                                        </span>
                                                    </div>
                                                    <div style={{ fontWeight: 'bold', color: '#16a34a' }}>
                                                        +{salaryInfo.total_bonuses.toFixed(2)} Баллов
                                                    </div>
                                                </div>
                                                <div style={{ backgroundColor: 'white' }}>
                                                    {salaryInfo.bonuses.map((bonus, index) => (
                                                        <div
                                                            key={bonus.id}
                                                            style={{
                                                                padding: '12px 15px',
                                                                borderBottom: index < salaryInfo.bonuses.length - 1 ? '1px solid #f3f4f6' : 'none',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: '500', color: '#1f2937' }}>
                                                                    {bonus.name}
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                                    {bonus.date}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ fontWeight: '600', color: '#16a34a' }}>
                                                                    +{bonus.price.toFixed(2)} Баллов
                                                                </div>
                                                                <button
                                                                    onClick={() => handleDeleteBonus(bonus.id, salaryInfo.user_info.id)}
                                                                    disabled={deletingItems.bonuses.includes(bonus.id)}
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        backgroundColor: deletingItems.bonuses.includes(bonus.id) ? '#9ca3af' : '#ef4444',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        cursor: deletingItems.bonuses.includes(bonus.id) ? 'not-allowed' : 'pointer',
                                                                        fontSize: '12px',
                                                                        fontWeight: '500',
                                                                    }}
                                                                >
                                                                    {deletingItems.bonuses.includes(bonus.id) ? '...' : '✕'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

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
                                                            .sort((a, b) => new Date(b.date) - new Date(a.date))
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
                                                                        {shift.hourly_rate} Баллов/ч
                                                                    </td>
                                                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '500' }}>
                                                                        {shift.actual_salary ? (
                                                                            <span style={{ color: '#10b981' }}>
                                                                                {shift.actual_salary.toFixed(2)} Баллов
                                                                            </span>
                                                                        ) : (
                                                                            <span style={{ color: '#3b82f6' }}>
                                                                                {shift.planned_salary.toFixed(2)} Баллов
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

                                        {/* Детальный расчет итогов */}
                                       <div
                                        style={{
                                            marginTop: '20px',
                                            padding: '15px',
                                            backgroundColor: '#f8fafc',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                        }}
                                    >
                                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                                            📋 Детали расчета
                                        </div>
                                        
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ color: '#4b5563' }}>Зарплата за смены:</span>
                                            <span style={{ fontWeight: '500', color: '#10b981' }}>
                                                {salaryInfo.total_actual_salary.toFixed(2)} Баллов
                                            </span>
                                        </div>

                                        {salaryInfo.total_bonuses > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ color: '#4b5563' }}>Премии:</span>
                                                <span style={{ fontWeight: '500', color: '#16a34a' }}>
                                                    +{salaryInfo.total_bonuses.toFixed(2)} Баллов
                                                </span>
                                            </div>
                                        )}

                                        {salaryInfo.total_fines > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ color: '#4b5563' }}>Штрафы:</span>
                                                <span style={{ fontWeight: '500', color: '#dc2626' }}>
                                                    -{salaryInfo.total_fines.toFixed(2)} Баллов
                                                </span>
                                            </div>
                                        )}

                                        <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '10px 0' }}></div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: '600', color: '#1f2937' }}>Итого к выплате:</span>
                                            <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#1f2937' }}>
                                                {salaryInfo.final_salary.toFixed(2)} Баллов
                                            </span>
                                        </div>
                                    </div>

                                    {/* Итоговый блок */}
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
                                            🎯 ИТОГО К ВЫПЛАТЕ
                                        </div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                                            {salaryInfo.final_salary.toFixed(2)} Баллов
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>
                                            {salaryInfo.total_planned_hours}ч план / {salaryInfo.total_actual_hours || 0}ч факт
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
                        На выбранный период ({startDate} - {endDate}) нет данных о сменах сотрудников
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSalaryPage;