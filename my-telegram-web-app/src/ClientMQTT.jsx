import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { API_ENDPOINTS } from './constants/api';
import mqtt from 'mqtt';

export const ClientMQTTContext = createContext();

export const ClientMQTTProvider = ({ children, userData, onUserDataUpdate }) => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const clientRef = useRef(null);
  const [currentZoneId, setCurrentZoneId] = useState(null);
  const [personalTopic, setPersonalTopic] = useState(null);


  // Подключение к MQTT - ПРОСТО КАК В РАБОЧЕМ ПРИМЕРЕ
  useEffect(() => {
  
    
    // Проверяем, что все данные пользователя загружены и пользователь - НЕ админ
    if (!userData || !userData.id || userData.is_admin === true) {
      console.log('🚫 Клиентский MQTT отключен - пользователь админ или данные неполные');
      
      return;
    }
   
    console.log('___________пользователь_______________');
    console.log(userData);
    console.log('__________________________');

    console.log('🔄 Клиент начинает подключение к MQTT...');

    const client = mqtt.connect('wss://gorpark25.ru:3000/mqtt');
    client.on('connect', () => {
      
      console.log('✅ Клиент подключен к MQTT');
      // Создаем персональный топик для получения уведомлений от администратора
      const personalTopicName = `user_${userData.id}_confirmation`;
      setPersonalTopic(personalTopicName);

      // Подписываемся на персональный топик - ПРОСТО КАК В ПРИМЕРЕ
      client.subscribe(personalTopicName, { qos: 1 }, (err) => {
        if (err) {
          console.error('❌ Ошибка подписки на персональный топик:', err);
        } else {
          console.log('👤 Подписка на персональный топик установлена:', personalTopicName);
        }
      });
     subscribeToUserZones(client);
    });

    

    // Обработка сообщений - ПРОСТО КАК В ПРИМЕРЕ
    client.on('message', (topic, message) => {
           try {
             const parsedMessage = JSON.parse(message.toString());
             console.log(`📥 MQTT сообщение из топика ${topic}:`, parsedMessage);
             
             setMessages(prev => [...prev, { ...parsedMessage, topic, timestamp: Date.now() }]);
             
             // Обновляем текущую зону, если сообщение пришло из топика зоны
             if (topic.startsWith('zone_')) {
               const zoneId = parseInt(topic.split('_')[1]);
               setCurrentZoneId(zoneId);
             }
             
             // Обработка сообщений о подтверждении пользователя
             if (topic.includes('_confirmation') && parsedMessage.type === 'user_confirmation') {
               // Обновляем статус подтверждения пользователя
               if (userData && parsedMessage.user_id === userData.id) {
                 // Вызываем функцию обновления данных пользователя, если она доступна
                 if (onUserDataUpdate) {
                   onUserDataUpdate({ ...userData, confirmed: parsedMessage.confirmed });
                 }
               }
             }
           } catch (err) {
             console.error('❌ Ошибка обработки MQTT сообщения:', err);
           }
         });

    // Обработка ошибок
    client.on('error', (error) => {
      console.error('❌ MQTT ошибка:', error);
      setConnected(false);
    });

    // Обработка отключения
    client.on('close', () => {
      console.log('🔌 MQTT соединение закрыто');
      setConnected(false);
    });

    clientRef.current = client;

    // Очистка при размонтировании
    return () => {
      if (clientRef.current) {
        console.log('🧹 Очистка MQTT подключения клиента');
        clientRef.current.end();
      }
    };
  }, [userData]);

  const subscribeToUserZones = async (mqttClient) => {
    try {
      console.log('📍 Клиент начинает подписку на зоны...');
      
      // Получаем расписание пользователя на сегодня для определения зон
      await subscribeToUserScheduleZones(mqttClient);
    } catch (error) {
      console.error('❌ Ошибка получения зон пользователя:', error);
      // В случае ошибки подписываемся на диапазон зон как fallback
      console.log('🔄 Используем fallback подписку на зоны 1-5');
      for (let zoneId = 1; zoneId <= 5; zoneId++) {
        const zoneTopic = `zone_${zoneId}`;
        mqttClient.subscribe(zoneTopic, { qos: 1 }, (err) => {
          if (err) {
            console.error(`❌ Ошибка подписки на топик зоны ${zoneId}:`, err);
          } else {
            console.log(`📍 Подписка на топик зоны ${zoneId} установлена (fallback)`);
          }
        });
      }
    }
  };

  const subscribeToUserScheduleZones = async (mqttClient) => {
    try {
      console.log('📅 Клиент начинает получение зон из расписания...');
      
      // Получаем расписание пользователя на текущую неделю
      const today = new Date().toISOString().split('T')[0]; // Получаем сегодняшнюю дату в формате YYYY-MM-DD
      const response = await fetch(API_ENDPOINTS.GET_WORKER_WEEKLY_SCHEDULE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: userData.id,
          week_offset: 0, // Текущая неделя
          admin_id: userData.id,
          telegram_id: userData.telegram_id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result && result.status === 'success' && result.schedules && Array.isArray(result.schedules) && result.schedules.length > 0) {
        // Фильтруем расписание, чтобы получить только сегодняшние смены
        const todaySchedules = result.schedules.filter(schedule =>
          schedule.date.startsWith(today) // Проверяем, что дата начинается сегодняшней даты (schedule.date в формате "YYYY-MM-DDTHH:mm:ss.sssZ")
        );
        
        if (todaySchedules.length > 0) {
          // Извлекаем уникальные ID зон из сегодняшнего расписания
          const zoneIds = [...new Set(todaySchedules.map(schedule => schedule.zone_id))];
          
          console.log(`📅 Найдены зоны из сегодняшнего расписания пользователя: ${zoneIds.join(', ')}`);
          
          // Подписываемся на топики всех зон из сегодняшнего расписания пользователя с QoS 1
          zoneIds.forEach(zoneId => {
            const zoneTopic = `zone_${zoneId}`;
            mqttClient.subscribe(zoneTopic, { qos: 1 }, (err) => {
              if (err) {
                console.error(`❌ Ошибка подписки на топик зоны ${zoneId}:`, err);
              } else {
                console.log(`📍 Подписка на топик зоны ${zoneId} установлена (из сегодняшнего расписания)`);
              }
            });
          });
          
          // Устанавливаем первую зону как текущую
          if (zoneIds.length > 0) {
            setCurrentZoneId(zoneIds[0]);
          }
          
          console.log(`✅ Клиент подписан на ${zoneIds.length} зон из сегодняшнего расписания`);
        } else {
          console.log('📅 У пользователя нет смен в расписании на сегодня');
          // Подписываемся на возможные зоны по умолчанию
          const defaultZoneIds = [1, 2, 3, 4, 5];
          console.log(`🔄 Используем резервные зоны: ${defaultZoneIds.join(', ')}`);
          
          defaultZoneIds.forEach(zoneId => {
            const zoneTopic = `zone_${zoneId}`;
            mqttClient.subscribe(zoneTopic, { qos: 1 }, (err) => {
              if (err) {
                console.error(`❌ Ошибка подписки на топик зоны ${zoneId}:`, err);
              } else {
                console.log(`📍 Подписка на топик зоны ${zoneId} установлена (резервная)`);
              }
            });
          });
        }
      } else {
        console.log('📅 У пользователя нет расписания на текущую неделю или ошибка API');
        // Подписываемся на возможные зоны по умолчанию
        const defaultZoneIds = [1, 2, 3, 4, 5];
        console.log(`🔄 Используем резервные зоны: ${defaultZoneIds.join(', ')}`);
        
        defaultZoneIds.forEach(zoneId => {
          const zoneTopic = `zone_${zoneId}`;
          mqttClient.subscribe(zoneTopic, { qos: 1 }, (err) => {
            if (err) {
              console.error(`❌ Ошибка подписки на топик зоны ${zoneId}:`, err);
            } else {
              console.log(`📍 Подписка на топик зоны ${zoneId} установлена (резервная)`);
            }
          });
        });
      }
    } catch (error) {
      console.error('❌ Ошибка получения зон из расписания пользователя:', error);
      // В случае ошибки подписываемся на диапазон зон как fallback
      console.log('🔄 Используем fallback подписку на зоны 1-5');
      for (let zoneId = 1; zoneId <= 5; zoneId++) {
        const zoneTopic = `zone_${zoneId}`;
        mqttClient.subscribe(zoneTopic, { qos: 1 }, (err) => {
          if (err) {
            console.error(`❌ Ошибка подписки на топик зоны ${zoneId}:`, err);
          } else {
            console.log(`📍 Подписка на топик зоны ${zoneId} установлена (fallback)`);
          }
        });
      }
    }
  };

  // Функция для публикации сообщений - ПРОСТО КАК В ПРИМЕРЕ
  const publish = (topic, message) => {
    if (clientRef.current && connected) {
      clientRef.current.publish(topic, JSON.stringify(message), { qos: 1 });
      console.log(`📤 Отправлено сообщение в топик ${topic}:`, message);
    }
  };

  return (
    <ClientMQTTContext.Provider value={{
      connected,
      messages,
      publish,
      currentZoneId,
      personalTopic,
      isClient: userData?.is_admin !== true
    }}>
      {children}
    </ClientMQTTContext.Provider>
  );
};

export const useClientMQTT = () => {
  const context = useContext(ClientMQTTContext);
  if (!context) {
    throw new Error('useClientMQTT must be used within ClientMQTTProvider');
  }
  return context;
};

export default ClientMQTTProvider;