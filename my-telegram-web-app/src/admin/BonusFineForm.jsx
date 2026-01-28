import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../constants/api';

const BonusFineForm = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  type, // 'bonus' или 'fine'
  user,
  userData 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    price: ''
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
const [currentDate, setCurrentDate] = useState('');

  // Загрузка шаблонов при открытии формы
  useEffect(() => {
  if (isOpen) {
    fetchTemplates();
    fetchCurrentDate();
  } else {
    // Сброс формы при закрытии
    setFormData({ name: '', price: '' });
    setUseTemplate(false);
    setSelectedDate('');
    setCurrentDate('');
  }
}, [isOpen]);

const fetchCurrentDate = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.GET_CURRENT_DATE);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const result = await response.json();
    if (result.status === 'success') {
      setCurrentDate(result.date);
      setSelectedDate(result.date); // Устанавливаем текущую дату по умолчанию
    }
  } catch (err) {
    console.error('❌ Ошибка загрузки текущей даты:', err);
    // В случае ошибки используем текущую дату из JS
    const today = new Date().toISOString().split('T')[0];
    setCurrentDate(today);
    setSelectedDate(today);
  }
};

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const endpoint = type === 'bonus' 
        ? API_ENDPOINTS.GET_ALL_BONUS_TEMPLATES 
        : API_ENDPOINTS.GET_ALL_FINE_TEMPLATES;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: userData.id,
          telegram_id: userData.telegram_id,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();

      if (result.status === 'success') {
        setTemplates(result.templates || []);
      } else {
        throw new Error(result.message || `Ошибка при загрузке шаблонов ${type}`);
      }
    } catch (err) {
      console.error(`❌ Ошибка загрузки шаблонов ${type}:`, err);
      alert(`Ошибка при загрузке шаблонов: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setFormData({
      name: template.name,
      price: template.price.toString()
    });
    setUseTemplate(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.price) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (isNaN(parseFloat(formData.price))) {
      alert('Пожалуйста, введите корректную сумму');
      return;
    }

    try {
      setLoading(true);
      
      const endpoint = type === 'bonus' 
        ? API_ENDPOINTS.CREATE_BONUS 
        : API_ENDPOINTS.CREATE_FINE;
      
      // Создаем базовый объект запроса
      const bonusOrFineData = {
        name: formData.name,
        price: parseFloat(formData.price),
        user_id: user.id
      };

      // Добавляем дату created_at только если она отличается от текущей
      if (selectedDate && selectedDate !== currentDate) {
        bonusOrFineData.created_at = selectedDate + "T00:00:00Z"; // Формат ISO
      }

      const requestData = {
        [type]: bonusOrFineData,
        admin_id: userData.id,
        telegram_id: userData.telegram_id,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        alert(`${type === 'bonus' ? 'Премия' : 'Штраф'} успешно добавлен${type === 'bonus' ? 'а' : ''}!`);
        onSubmit(result[type] || {});
        onClose();
      } else {
        throw new Error(result.message || `Ошибка при добавлении ${type}`);
      }
    } catch (err) {
      console.error(`❌ Ошибка добавления ${type}:`, err);
      alert(`Ошибка при добавлении ${type === 'bonus' ? 'премии' : 'штрафа'}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
        <h3 style={{ margin: '0 0 15px 0' }}>
          {type === 'bonus' ? '✅ Добавить премию' : '❌ Добавить штраф'} для {user.first_name} {user.last_name || ''}
        </h3>

        {/* Выбор шаблона */}
        {!useTemplate && templates.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              📋 Использовать шаблон:
            </label>
            <select
              onChange={(e) => {
                const template = templates.find(t => t.id === parseInt(e.target.value));
                if (template) handleTemplateSelect(template);
              }}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'white',
              }}
            >
              <option value="">Выберите шаблон...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({type === 'bonus' ? '+' : '-'}{template.price} Баллов)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Кнопка сброса использования шаблона */}
        {useTemplate && (
          <div style={{ marginBottom: '15px', textAlign: 'right' }}>
            <button
              onClick={() => setUseTemplate(false)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#a0aec0',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ✏️ Ввести вручную
            </button>
          </div>
        )}

        {/* Форма ввода */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            📝 Название:
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Введите название премии/штрафа"
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
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            💰 Сумма ({type === 'bonus' ? '+' : '-'} Баллов):
          </label>
          <input
            type="text"
            value={formData.price}
            onChange={(e) => {
              // Разрешаем только цифры и точку (но только одну)
              const value = e.target.value;
              // Проверяем, что значение содержит только цифры и максимум одну точку
              if (/^\d*\.?\d*$/.test(value) || value === '') {
                // Также проверяем, что точка не стоит в начале (кроме случая "0.")
                if (!(value.startsWith('.') && value !== '.' && !value.startsWith('0.'))) {
                  setFormData({ ...formData, price: value });
                }
              }
            }}
            onKeyDown={(e) => {
              // Блокируем клавиши, которые могут привести к вводу недопустимых символов
              if (!e.key.match(/[\d\.]|Backspace|Delete|ArrowLeft|ArrowRight|Tab|Enter|Escape/) &&
                  !(e.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase()))) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              // Обрабатываем вставку текста из буфера обмена
              e.preventDefault();
              const paste = (e.clipboardData || window.clipboardData).getData('text');
              // Проверяем, что вставляемый текст содержит только допустимые символы
              if (/^\d*\.?\d*$/.test(paste)) {
                setFormData({ ...formData, price: paste });
              }
            }}
            placeholder="Введите сумму"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              📅 Дата ({currentDate === selectedDate ? 'Сегодня' : 'Выбрана другая дата'}):
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
            {selectedDate !== currentDate && (
              <button
                onClick={() => setSelectedDate(currentDate)}
                style={{
                  marginTop: '5px',
                  padding: '5px 10px',
                  backgroundColor: '#a0aec0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ↺ Сбросить на сегодня
              </button>
            )}
          </div>
        </div>


        {/* Кнопки управления */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: type === 'bonus' ? '#38a169' : '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              flex: 1,
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {loading ? '📤 Отправка...' : (type === 'bonus' ? '✅ Добавить премию' : '❌ Добавить штраф')}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#718096',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              flex: 1,
              fontSize: '14px',
            }}
          >
            ❌ Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default BonusFineForm;