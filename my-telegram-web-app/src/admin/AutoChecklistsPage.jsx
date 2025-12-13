import React, { useState, useEffect } from 'react';
import { API_URL } from '../constants/api';

const AutoChecklistsPage = ({ zoneId, zoneName, userData, onBack }) => {
  const [autoChecklists, setAutoChecklists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChecklist, setNewChecklist] = useState({
    description: '',
    important: false
  });
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [editForm, setEditForm] = useState({
    description: '',
    important: false
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
          important: newChecklist.important,
          admin_id: userData.id,
          telegram_id: userData.telegram_id
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        setAutoChecklists(prev => [...prev, result.autochek]);
        setNewChecklist({ description: '', important: false });
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
          zone_id: autoChecklistId,
          admin_id: userData.id,
          telegram_id: userData.telegram_id
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
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

  // Функция для начала редактирования
  const startEditAutoChecklist = (autoChecklist) => {
    setEditingChecklist(autoChecklist.id);
    setEditForm({
      description: autoChecklist.description,
      important: autoChecklist.important
    });
  };

  // Функция для отмены редактирования
  const cancelEdit = () => {
    setEditingChecklist(null);
    setEditForm({ description: '', important: false });
  };

  // Функция для сохранения изменений
  const handleSaveEdit = async (autoChecklistId) => {
    if (!editForm.description.trim()) {
      alert('Пожалуйста, введите описание чеклиста');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/update-auto-checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_checklist_id: autoChecklistId,
          description: editForm.description,
          important: editForm.important,
          admin_id: userData.id,
          telegram_id: userData.telegram_id
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        setAutoChecklists(prev => prev.map(ac =>
          ac.id === autoChecklistId
            ? { ...ac, description: editForm.description, important: editForm.important }
            : ac
        ));
        setEditingChecklist(null);
        setEditForm({ description: '', important: false });
        alert('Авточеклист успешно обновлен!');
      } else {
        throw new Error(result.message || 'Ошибка при обновлении авточеклиста');
      }
    } catch (err) {
      console.error('❌ Ошибка обновления авточеклиста:', err);
      alert('Ошибка при обновлении авточеклиста: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '15px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px 12px',
            backgroundColor: '#e2e8f0',
            color: '#4a5568',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          ⬅️ Назад
        </button>
        <div>
          <h2 style={{ margin: 0, color: '#1f2937' }}>🤖 Авточек-листы</h2>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            Зона: <strong>{zoneName}</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <div>🔄 Загрузка авточеклистов...</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#ef4444' }}>
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
              fontSize: '14px'
            }}
          >
            Повторить
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#4a5568' }}>Авточек-листы ({autoChecklists.length})</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {showAddForm ? '❌ Отмена' : '➕ Добавить'}
            </button>
          </div>

          {showAddForm && (
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>Добавить новый авточек-лист</h4>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#4a5568' }}>Описание:</label>
                <textarea
                  value={newChecklist.description}
                  onChange={(e) => setNewChecklist({ ...newChecklist, description: e.target.value })}
                  placeholder="Введите описание авточеклиста"
                  rows="3"
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500', color: '#4a5568', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newChecklist.important}
                    onChange={(e) => setNewChecklist({ ...newChecklist, important: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  ⭐ Важное
                </label>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Отметьте если этот пункт особенно важен</div>
              </div>

              <button
                onClick={handleAddAutoChecklist}
                style={{ padding: '10px 20px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
              >
                ✅ Добавить авточек-лист
              </button>
            </div>
          )}

          {autoChecklists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div>📭 Авточек-листы не найдены</div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>Для этой зоны пока нет настроенных авточек-листов</div>
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
                    borderLeft: autoChecklist.important ? '4px solid #f59e0b' : '1px solid #e5e7eb'
                  }}
                >
                  {editingChecklist === autoChecklist.id ? (
                    // ФОРМА РЕДАКТИРОВАНИЯ
                    <div>
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#4a5568' }}>Описание:</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Введите описание авточеклиста"
                          rows="3"
                          style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                        />
                      </div>
                      
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500', color: '#4a5568', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editForm.important}
                            onChange={(e) => setEditForm({ ...editForm, important: e.target.checked })}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          ⭐ Важное
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleSaveEdit(autoChecklist.id)}
                          style={{ padding: '8px 16px', backgroundColor: '#38a169', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', flex: 1 }}
                        >
                          💾 Сохранить
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{ padding: '8px 16px', backgroundColor: '#a0aec0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', flex: 1 }}
                        >
                          ❌ Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ОТОБРАЖЕНИЕ
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '5px' }}>
                            {autoChecklist.important && (
                              <span style={{ color: '#f59e0b', fontSize: '16px', flexShrink: 0 }}>⭐</span>
                            )}
                            <div style={{ fontWeight: '500', color: autoChecklist.important ? '#d97706' : '#1f2937' }}>
                              {autoChecklist.description}
                            </div>
                          </div>
                          {autoChecklist.important && (
                            <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '500' }}>Важный пункт</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            onClick={() => startEditAutoChecklist(autoChecklist)}
                            style={{ padding: '5px 10px', backgroundColor: '#4299e1', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}
                          >
                            ✏️ Редакт
                          </button>
                          <button
                            onClick={() => handleDeleteAutoChecklist(autoChecklist.id)}
                            style={{ padding: '5px 10px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}
                          >
                            🗑️ Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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