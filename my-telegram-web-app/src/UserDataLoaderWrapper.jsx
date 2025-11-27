import React, { useState, useEffect } from 'react';
import UserDataLoader from './UserDataLoader';
import { API_URL } from './constants/api'

const UserDataLoaderWrapper = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        const tgUserID = urlParams.get('tg_user_id');

        if (id && tgUserID) {
          // Запрашиваем актуальные данные с сервера
                  const response = await fetch(`${API_URL}/get-user`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      user_id: parseInt(id),
                      telegram_id: parseInt(tgUserID),
                    }),
                  })
          
                  if (!response.ok) {
                    const errorText = await response.text()
                    throw new Error(`Ошибка сервера: ${response.status}, ${errorText}`)
                  }
          
                  const result = await response.json()
          
                  if (result.status !== 'success') {
                    throw new Error(result.message || 'Ошибка при загрузке данных')
                  }
          
                  console.log('✅ Полные данные загружены с сервера:', result.user)
                  setUserData(result.user)
        } else {
          console.error('❌ Не найдены id или tg_user_id в URL');
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки данных пользователя:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []); // Убираем зависимости, чтобы функция вызывалась только при монтировании

  // Функция для обновления пользовательских данных
  const handleUserDataUpdate = (newUserData) => {
    console.log('🔄 Обновление данных пользователя в Wrapper:', newUserData);
    setUserData(newUserData);
  };

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <h2>🔄 Загрузка данных...</h2>
        <p>Получаем информацию о пользователе</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <h2>❌ Данные не найдены</h2>
        <p>Не удалось загрузить информацию о пользователе</p>
      </div>
    );
  }

  return (
  	<UserDataLoader
  		userData={userData}
  		onUserDataUpdate={handleUserDataUpdate}
  	/>
  );
};

export default UserDataLoaderWrapper;