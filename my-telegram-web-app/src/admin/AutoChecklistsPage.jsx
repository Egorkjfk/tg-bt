import React, { useState, useEffect } from 'react';
import { API_URL } from '../constants/api';

const AutoChecklistsPage = ({ zoneId, userData, onBack }) => {
  const [autoChecklists, setAutoChecklists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChecklist, setNewChecklist] = useState({
    description: ''
  });

  // Загрузка авточеклистов для зоны
  const fetchAutoChecklists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/get-auto-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: zoneId,
          admin_id: userData.id,
          telegram_id: userData.telegram_id
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        setAutoChecklists(result.checklists || []);
      } else {
        throw new Error(result.message || 'Ошибка при загрузке авточеклистов');
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки авточеклистов:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (zoneId && userData) {
      fetchAutoChecklists();
    }
  }, [zoneId, userData]);

  // Функция для добавления нового авточеклиста
  const handleAddAutoChecklist = async () => {
    if (!newChecklist.description.trim()) {
      alert('Пожалуйста, введите описание чеклиста');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/create-auto-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: zoneId,
          description: newChecklist.description,
          admin_id: userData.id,
          telegram_id: userData.telegram_id
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        // Добавляем новый авточеклист к существующему списку
        setAutoChecklists(prev => [...prev, result.autochek]);
        setNewChecklist({ description: '' });
        setShowAddForm(false);
        alert('Авточеклист успешно добавлен!');
      } else {
        throw new Error(result.message || 'Ошибка при добавлении авточеклиста');
      }
    } catch (err) {
      console.error('❌ Ошибка добавления авточеклиста:', err);
      alert('Ошибка при добавлении авточеклиста: ' + err.message);
    }
  };

  // Функция для удаления авточеклиста
  const handleDeleteAutoChecklist = async (autoChecklistId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот авточеклист?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/delete-auto-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: autoChecklistId, // сервер ожидает поле с тегом JSON "zone_id" для ID авточеклиста при удалении
          admin_id: userData.id,
          telegram_id: userData.telegram_id
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        // Удаляем авточеклист из списка
        setAutoChecklists(prev => prev.filter(ac => ac.id !== autoChecklistId));
        alert('Авточеклист успешно удален!');
      } else {
        throw new Error(result.message || 'Ошибка при удалении авточеклиста');
      }
    } catch (err) {
      console.error('❌ Ошибка удаления авточеклиста:', err);
      alert('Ошибка при удалении авточеклиста: ' + err.message);
    }
  };

  return (
    <div
      style={{
        padding: '15px',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: '8px 12px',
            backgroundColor: '#e2e8f0',
            color: '#4a5568',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          ⬅️ Назад
        </button>
        <h2 style={{ margin: 0, color: '#1f2937' }}>🤖 Авточек-листы для зоны #{zoneId}</h2>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            color: '#6b7280',
          }}
        >
          <div>🔄 Загрузка авточеклистов...</div>
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
            onClick={fetchAutoChecklists}
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
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: 0, color: '#4a5568' }}>
              Авточек-листы ({autoChecklists.length})
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {showAddForm ? '❌ Отмена' : '➕ Добавить'}
            </button>
          </div>

          {/* Форма добавления нового авточеклиста */}
          {showAddForm && (
            <div
              style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '12px',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <h4 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>Добавить новый авточек-лист</h4>
              <div style={{ marginBottom: '15px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: '500',
                    color: '#4a5568',
                  }}
                >
                  Описание:
                </label>
                <textarea
                  value={newChecklist.description}
                  onChange={(e) => setNewChecklist({ ...newChecklist, description: e.target.value })}
                  placeholder="Введите описание авточеклиста"
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
              <button
                onClick={handleAddAutoChecklist}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#38a169',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✅ Добавить авточек-лист
              </button>
            </div>
          )}

          {/* Список авточеклистов */}
          {autoChecklists.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6b7280',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <div>📭 Авточек-листы не найдены</div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>
                Для этой зоны пока нет настроенных авточек-листов
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {autoChecklists.map((autoChecklist, index) => (
                <div
                  key={autoChecklist.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', marginBottom: '5px' }}>
                        #{autoChecklist.id} - {autoChecklist.description}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAutoChecklist(autoChecklist.id)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#e53e3e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AutoChecklistsPage;