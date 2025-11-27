
// SimpleUserInfo.jsx
import React, { useEffect, useState } from 'react';
import { MainButton, BackButton } from '@vkruglikov/react-telegram-web-app';

const SimpleUserInfo = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      tg.expand();
      tg.setBackgroundColor('#f8f9fa');
      
      if (tg.initDataUnsafe?.user) {
        setUserData(tg.initDataUnsafe.user);
        console.log('👤 Данные пользователя:', tg.initDataUnsafe.user);
      }
      
      console.log('🔧 Telegram WebApp объект:', tg);
    }
  }, []);

  const handleSendData = () => {
    const tg = window.Telegram?.WebApp;
    
    if (!tg) {
      console.error('❌ Telegram WebApp не доступен');
      return;
    }

    if (!userData) {
      console.error('❌ userData не доступен');
      return;
    }

    const dataToSend = JSON.stringify({
      action: 'user_info',
      user_id: userData.id,
      username: userData.username || 'нет',
      first_name: userData.first_name || 'нет',
      last_name: userData.last_name || 'нет',
      language: userData.language_code || 'ru',
      is_premium: userData.is_premium || false,
      allows_write_to_pm: userData.allows_write_to_pm || false,
      platform: tg.platform || 'unknown',
      timestamp: new Date().toISOString()
    });

    console.log('📤 Отправляемые данные:', dataToSend);

    // Проверяем все методы
    console.log('🔍 Доступные методы:', Object.keys(tg).filter(key => typeof tg[key] === 'function'));

    // Пробуем разные способы отправки
    if (typeof tg.sendData === 'function') {
      console.log('✅ Используем tg.sendData');
      tg.sendData(dataToSend);
    } else if (typeof tg.SendData === 'function') {
      console.log('✅ Используем tg.SendData');
      tg.SendData(dataToSend);
    } else {
      console.error('❌ Ни один метод отправки не найден');
    }
  };

  const handleBackButton = () => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.close) {
      tg.close();
    }
  };

  if (!userData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Загрузка данных...</h2>
        <p>Получаем информацию о пользователе</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>📱 Тестовое приложение</h1>
      
      <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
        <h3>Данные пользователя:</h3>
        <p><strong>ID:</strong> {userData.id}</p>
        <p><strong>Имя:</strong> {userData.first_name}</p>
        <p><strong>Фамилия:</strong> {userData.last_name || 'нет'}</p>
        <p><strong>Юзернейм:</strong> @{userData.username || 'нет'}</p>
      </div>

      <button 
        onClick={handleSendData}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0088cc',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          marginBottom: '10px'
        }}
      >
        🔄 Тест отправки данных
      </button>

      <BackButton onClick={handleBackButton} />
      <MainButton
        text="📤 Отправить данные боту"
        onClick={handleSendData}
      />
    </div>
  );
};

export default SimpleUserInfo;