import React, { useState, useEffect } from 'react';
import LogisticianDashboard from './pages/LogisticianDashboard';
import DriverDashboard from './pages/DriverDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Для тестов — мок-данные
    setTimeout(() => {
      setUser({ id: 1, full_name: 'Тест Логист', role: 'logistician', messenger_id: 'test' });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Загрузка...</div>;

  return user.role === 'logistician' 
    ? <LogisticianDashboard user={user} /> 
    : <DriverDashboard user={user} />;
}