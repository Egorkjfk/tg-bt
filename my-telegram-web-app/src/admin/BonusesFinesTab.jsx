import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../constants/api';

const BonusesFinesTab = ({ userData }) => {
    const [fineTemplates, setFineTemplates] = useState([]);
    const [bonusTemplates, setBonusTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAddFineTemplate, setShowAddFineTemplate] = useState(false);
    const [showAddBonusTemplate, setShowAddBonusTemplate] = useState(false);
    const [newFineTemplate, setNewFineTemplate] = useState({ name: '', price: '' });
    const [newBonusTemplate, setNewBonusTemplate] = useState({ name: '', price: '' });
    const [activeTab, setActiveTab] = useState('fines'); // 'fines' или 'bonuses'
    const [isMobile, setIsMobile] = useState(false);

    // Определяем мобильное устройство
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    // Загрузка шаблонов
    const fetchTemplates = async () => {
        try {
            setLoading(true);
            setError(null);

            // Загрузка шаблонов штрафов
            const fineResponse = await fetch(API_ENDPOINTS.GET_ALL_FINE_TEMPLATES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_id: userData.id,
                    telegram_id: userData.telegram_id,
                }),
            });

            if (!fineResponse.ok) throw new Error(`HTTP error! status: ${fineResponse.status}`);
            const fineResult = await fineResponse.json();
            if (fineResult.status === 'success') {
                setFineTemplates(fineResult.templates || []);
            } else {
                throw new Error(fineResult.message || 'Ошибка при загрузке шаблонов штрафов');
            }

            // Загрузка шаблонов премий
            const bonusResponse = await fetch(API_ENDPOINTS.GET_ALL_BONUS_TEMPLATES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_id: userData.id,
                    telegram_id: userData.telegram_id,
                }),
            });

            if (!bonusResponse.ok) throw new Error(`HTTP error! status: ${bonusResponse.status}`);
            const bonusResult = await bonusResponse.json();
            if (bonusResult.status === 'success') {
                setBonusTemplates(bonusResult.templates || []);
            } else {
                throw new Error(bonusResult.message || 'Ошибка при загрузке шаблонов премий');
            }
        } catch (err) {
            console.error('❌ Ошибка загрузки шаблонов:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [userData]);

    // Создание шаблона штрафа
    const createFineTemplate = async () => {
        if (!newFineTemplate.name.trim() || !newFineTemplate.price) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.CREATE_FINE_TEMPLATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template: {
                        name: newFineTemplate.name,
                        price: parseFloat(newFineTemplate.price),
                    },
                    admin_id: userData.id,
                    telegram_id: userData.telegram_id,
                }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.status === 'success') {
                setNewFineTemplate({ name: '', price: '' });
                setShowAddFineTemplate(false);
                fetchTemplates(); // Обновляем список
                alert('Шаблон штрафа успешно создан');
            } else {
                throw new Error(result.message || 'Ошибка при создании шаблона штрафа');
            }
        } catch (err) {
            console.error('❌ Ошибка создания шаблона штрафа:', err);
            alert('Ошибка при создании шаблона штрафа: ' + err.message);
        }
    };

    // Создание шаблона премии
    const createBonusTemplate = async () => {
        if (!newBonusTemplate.name.trim() || !newBonusTemplate.price) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.CREATE_BONUS_TEMPLATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template: {
                        name: newBonusTemplate.name,
                        price: parseFloat(newBonusTemplate.price),
                    },
                    admin_id: userData.id,
                    telegram_id: userData.telegram_id,
                }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.status === 'success') {
                setNewBonusTemplate({ name: '', price: '' });
                setShowAddBonusTemplate(false);
                fetchTemplates(); // Обновляем список
                alert('Шаблон премии успешно создан');
            } else {
                throw new Error(result.message || 'Ошибка при создании шаблона премии');
            }
        } catch (err) {
            console.error('❌ Ошибка создания шаблона премии:', err);
            alert('Ошибка при создании шаблона премии: ' + err.message);
        }
    };

    // Удаление шаблона штрафа
    const deleteFineTemplate = async (templateId) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот шаблон штрафа?')) {
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.DELETE_FINE_TEMPLATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template_id: templateId,
                    admin_id: userData.id,
                    telegram_id: userData.telegram_id,
                }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.status === 'success') {
                fetchTemplates(); // Обновляем список
                alert('Шаблон штрафа успешно удален');
            } else {
                throw new Error(result.message || 'Ошибка при удалении шаблона штрафа');
            }
        } catch (err) {
            console.error('❌ Ошибка удаления шаблона штрафа:', err);
            alert('Ошибка при удалении шаблона штрафа: ' + err.message);
        }
    };

    // Удаление шаблона премии
    const deleteBonusTemplate = async (templateId) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот шаблон премии?')) {
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.DELETE_BONUS_TEMPLATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template_id: templateId,
                    admin_id: userData.id,
                    telegram_id: userData.telegram_id,
                }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.status === 'success') {
                fetchTemplates(); // Обновляем список
                alert('Шаблон премии успешно удален');
            } else {
                throw new Error(result.message || 'Ошибка при удалении шаблона премии');
            }
        } catch (err) {
            console.error('❌ Ошибка удаления шаблона премии:', err);
            alert('Ошибка при удалении шаблона премии: ' + err.message);
        }
    };

    // Компонент списка штрафов
    const FinesList = () => (
        <div style={{ marginBottom: isMobile ? '20px' : '0' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                }}
            >
                <h4 style={{ margin: 0, color: '#e53e3e' }}>❌ Шаблоны штрафов</h4>
                <button
                    onClick={() => setShowAddFineTemplate(true)}
                    style={{
                        padding: '5px 10px',
                        backgroundColor: '#e53e3e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                    }}
                >
                    ➕ Добавить
                </button>
            </div>

            {fineTemplates.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>Шаблонов штрафов нет</p>
            ) : (
                <div style={{ overflowY: 'visible' }}>
                    {fineTemplates.map((template, index) => (
                        <div
                            key={template.id}
                            style={{
                                padding: '10px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                marginBottom: '5px',
                                backgroundColor: index % 2 === 0 ? '#fff5f5' : 'white',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong>{template.name}</strong> - <span style={{ color: '#e53e3e' }}>-{template.price} Баллов</span>
                                </div>
                                <button
                                    onClick={() => deleteFineTemplate(template.id)}
                                    style={{
                                        padding: '3px 6px',
                                        backgroundColor: '#e53e3e',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                    }}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // Компонент списка премий
    const BonusesList = () => (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                }}
            >
                <h4 style={{ margin: 0, color: '#38a169' }}>✅ Шаблоны премий</h4>
                <button
                    onClick={() => setShowAddBonusTemplate(true)}
                    style={{
                        padding: '5px 10px',
                        backgroundColor: '#38a169',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                    }}
                >
                    ➕ Добавить
                </button>
            </div>

            {bonusTemplates.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>Шаблонов премий нет</p>
            ) : (
                <div style={{ overflowY: 'visible' }}>
                    {bonusTemplates.map((template, index) => (
                        <div
                            key={template.id}
                            style={{
                                padding: '10px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                marginBottom: '5px',
                                backgroundColor: index % 2 === 0 ? '#f0fff4' : 'white',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong>{template.name}</strong> - <span style={{ color: '#38a169' }}>+{template.price} Баллов</span>
                                </div>
                                <button
                                    onClick={() => deleteBonusTemplate(template.id)}
                                    style={{
                                        padding: '3px 6px',
                                        backgroundColor: '#e53e3e',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                    }}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <h2>🔄 Загрузка шаблонов...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <h2 style={{ color: '#e53e3e' }}>❌ Ошибка</h2>
                <p>{error}</p>
                <button
                    onClick={fetchTemplates}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#4299e1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                    }}
                >
                    Повторить
                </button>
            </div>
        );
    }

    return (
        <div
            style={{
                backgroundColor: 'white',
                borderRadius: '0px',
                padding: '0px',
                margin: '0',
                width: '100%',
                overflow: 'hidden'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>🎁 Премии и штрафы</h3>
                <button
                    onClick={fetchTemplates}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#4299e1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    🔄 Обновить
                </button>
            </div>

            {/* Мобильная версия с табами */}
            {isMobile ? (
                <div>
                    {/* Табы для мобильной версии */}
                    <div
                        style={{
                            display: 'flex',
                            borderBottom: '2px solid #e2e8f0',
                            marginBottom: '15px',
                        }}
                    >
                        <button
                            onClick={() => setActiveTab('fines')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: activeTab === 'fines' ? '#e53e3e' : 'transparent',
                                color: activeTab === 'fines' ? 'white' : '#718096',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold',
                            }}
                        >
                            ❌ Штрафы ({fineTemplates.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('bonuses')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: activeTab === 'bonuses' ? '#38a169' : 'transparent',
                                color: activeTab === 'bonuses' ? 'white' : '#718096',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold',
                            }}
                        >
                            ✅ Премии ({bonusTemplates.length})
                        </button>
                    </div>

                    {/* Контент табов */}
                    {activeTab === 'fines' && <FinesList />}
                    {activeTab === 'bonuses' && <BonusesList />}
                </div>
            ) : (
                /* Десктопная версия с двумя колонками */
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '20px',
                        alignItems: 'start'
                    }}
                >
                    <FinesList />
                    <BonusesList />
                </div>
            )}

            {/* Модальные окна (остаются без изменений) */}
            {showAddFineTemplate && (
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
                            maxWidth: '400px',
                        }}
                    >
                        <h3>➕ Добавить шаблон штрафа</h3>
                        
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
                                value={newFineTemplate.name}
                                onChange={(e) => setNewFineTemplate({ ...newFineTemplate, name: e.target.value })}
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
                                Сумма (Баллов):
                            </label>
                            <input
                                type='text'
                                value={newFineTemplate.price}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^\d*\.?\d*$/.test(value) || value === '') {
                                        if (!(value.startsWith('.') && value !== '.' && !value.startsWith('0.'))) {
                                            setNewFineTemplate({ ...newFineTemplate, price: value });
                                        }
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (!e.key.match(/[\d\.]|Backspace|Delete|ArrowLeft|ArrowRight|Tab|Enter|Escape/) &&
                                        !(e.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase()))) {
                                        e.preventDefault();
                                    }
                                }}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    const paste = (e.clipboardData || window.clipboardData).getData('text');
                                    if (/^\d*\.?\d*$/.test(paste)) {
                                        setNewFineTemplate({ ...newFineTemplate, price: paste });
                                    }
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
                                onClick={createFineTemplate}
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
                                💸 Создать штраф
                            </button>
                            <button
                                onClick={() => setShowAddFineTemplate(false)}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#718096',
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
            )}

            {showAddBonusTemplate && (
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
                            maxWidth: '400px',
                        }}
                    >
                        <h3>➕ Добавить шаблон премии</h3>
                        
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
                                value={newBonusTemplate.name}
                                onChange={(e) => setNewBonusTemplate({ ...newBonusTemplate, name: e.target.value })}
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
                                Сумма (Баллов):
                            </label>
                            <input
                                type='text'
                                value={newBonusTemplate.price}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^\d*\.?\d*$/.test(value) || value === '') {
                                        if (!(value.startsWith('.') && value !== '.' && !value.startsWith('0.'))) {
                                            setNewBonusTemplate({ ...newBonusTemplate, price: value });
                                        }
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (!e.key.match(/[\d\.]|Backspace|Delete|ArrowLeft|ArrowRight|Tab|Enter|Escape/) &&
                                        !(e.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase()))) {
                                        e.preventDefault();
                                    }
                                }}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    const paste = (e.clipboardData || window.clipboardData).getData('text');
                                    if (/^\d*\.?\d*$/.test(paste)) {
                                        setNewBonusTemplate({ ...newBonusTemplate, price: paste });
                                    }
                                }}
                                placeholder="Введите сумму"
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
                                onClick={createBonusTemplate}
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
                                💰 Создать премию
                            </button>
                            <button
                                onClick={() => setShowAddBonusTemplate(false)}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#718096',
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
            )}
        </div>
    );
};

export default BonusesFinesTab;