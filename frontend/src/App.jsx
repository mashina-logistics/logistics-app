import React, { useState, useEffect } from 'react';
import LogisticianDashboard from './pages/LogisticianDashboard';
import DriverDashboard from './pages/DriverDashboard';

const API_URL = import.meta.env.VITE_API_URL || 'https://logistics-app-production-e4a3.up.railway.app';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Получаем данные из Telegram WebApp (если доступно)
        const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
       const messengerId = tg?.id?.toString() || 'test_logistician';
        const fullName = (tg?.first_name || 'Тест') + ' ' + (tg?.last_name || 'Логист');

        // Пытаемся найти пользователя в базе
        const response = await fetch(`${API_URL}/users/by-messenger/${messengerId}`);
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Создаём нового пользователя (для теста - логист)
          const createResponse = await fetch(`${API_URL}/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messenger_id: messengerId,
              full_name: fullName,
             role: 'logistician',
              phone: '+79999999999'
            })
          });
          if (createResponse.ok) {
            const newUser = await createResponse.json();
            setUser(newUser);
          } else {
            // Fallback
            setUser({ id: 1, full_name: fullName, role: 'logistician', messenger_id: messengerId });
          }
        }
      } catch (error) {
        console.error('Ошибка авторизации:', error);
        setUser({ id: 1, full_name: 'Тест Логист', role: 'logistician', messenger_id: 'test' });
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Загрузка...</div>;

// Показываем панель в зависимости от роли
return user.role === 'logistician' 
  ? <LogisticianDashboard user={user} /> 
  : <DriverDashboard user={user} />;
}
