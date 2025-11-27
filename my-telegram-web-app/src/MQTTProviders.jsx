import React, { useRef, useEffect, useState } from 'react';
import ClientMQTTProvider from './ClientMQTT';
import { AdminMQTTProvider } from './AdminMQTT';

// Компонент для инициализации MQTT-провайдеров только после полной загрузки данных
const MQTTProviders = ({ userData, children }) => {
  const initializedRef = useRef(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Проверяем, что данные полные и устанавливаем флаг отображения
  useEffect(() => {
    if (userData && typeof userData.is_admin !== 'undefined' && !initializedRef.current) {
      initializedRef.current = true;
      setShouldRender(true);
    }
 }, [userData]);

  // Если данные не полные или еще не инициализировано - не отображаем MQTT-провайдеры
  if (typeof userData.is_admin === 'undefined' || !shouldRender) {
    return <>{children}</>;
  }

  // После инициализации возвращаем соответствующий MQTT-провайдер
 if (userData.is_admin) {
    return (
      <AdminMQTTProvider userData={userData}>
        {children}
      </AdminMQTTProvider>
    );
  } else {
    return (
      <ClientMQTTProvider userData={userData}>
        {children}
      </ClientMQTTProvider>
    );
  }
};

export default MQTTProviders;
