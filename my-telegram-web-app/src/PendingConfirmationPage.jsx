import React, { useEffect, useState } from 'react';
import { BackButton } from '@vkruglikov/react-telegram-web-app';
import { useClientMQTT } from './ClientMQTT';

const PendingConfirmationPage = ({ userData, onUserUpdate }) => {
  const [showAdminMessage, setShowAdminMessage] = useState(false);
  const mqttContext = useClientMQTT();
  const { messages } = mqttContext || {};

  // Обрабатываем MQTT сообщения о подтверждении
  useEffect(() => {
    if (messages && messages.length > 0) {
      const confirmationMessages = messages.filter(msg => 
        msg.type === 'user_confirmation' && 
        msg.user_id === userData?.id
      );
      
      if (confirmationMessages.length > 0) {
        const lastMessage = confirmationMessages[confirmationMessages.length - 1];
        
        if (lastMessage.confirmed === false) {
          setShowAdminMessage(true);
        }
        
        // Если подтвержден - обновляем данные
        if (lastMessage.confirmed === true && onUserUpdate) {
          onUserUpdate({ ...userData, confirmed: true });
        }
      }
    }
  }, [messages, userData, onUserUpdate]);

  const handleBackButton = () => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.close();
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          maxWidth: '400px',
          width: '100%',
        }}
      >
        {showAdminMessage ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
            <h2 style={{ color: '#1f2937', marginBottom: '15px' }}>
              Заявка отправлена
            </h2>
            <p style={{ color: '#6b7280', lineHeight: '1.5', marginBottom: '20px' }}>
              Администратор скоро вас добавит в систему. 
              Обычно это занимает несколько минут.
            </p>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #f59e0b',
                fontSize: '14px',
                color: '#92400e',
              }}
            >
              📢 Вы получите уведомление, когда администратор подтвердит вашу заявку
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>👤</div>
            <h2 style={{ color: '#1f2937', marginBottom: '15px' }}>
              Ожидание подтверждения
            </h2>
            <p style={{ color: '#6b7280', lineHeight: '1.5', marginBottom: '20px' }}>
              Ваш аккаунт ожидает подтверждения администратором.
            </p>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #0ea5e9',
                fontSize: '14px',
                color: '#0369a1',
              }}
            >
              🔄 Ожидайте подтверждения...
            </div>
          </>
        )}
        
        {/* Информация о пользователе */}
        <div
          style={{
            marginTop: '25px',
            padding: '15px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
            Ваши данные:
          </div>
          <div style={{ fontWeight: '500', color: '#1f2937' }}>
            {userData?.name || userData?.first_name || 'Не указано'}
          </div>
          {userData?.phone_number && (
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>
              📞 {userData.phone_number}
            </div>
          )}
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>
            ID: {userData?.id}
          </div>
        </div>
      </div>

      <BackButton onClick={handleBackButton} />
    </div>
  );
};

export default PendingConfirmationPage;