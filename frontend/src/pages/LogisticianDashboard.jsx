import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://logistics-app-production-e4a3.up.railway.app';

export default function LogisticianDashboard({ user }) {
  const [drivers, setDrivers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Состояние формы
  const [formData, setFormData] = useState({
    driver_id: '',
    sender: '',
    receiver: '',
    payer: '',
    delivery_city: '',
    waypoints: [
      {
        order_num: 1,
        waypoint_type: 'loading',
        address: '',
        city: '',
        contact_name: '',
        contact_phone: '',
        pallets: '',
        weight_kg: ''
      },
      {
        order_num: 2,
        waypoint_type: 'unloading',
        address: '',
        city: '',
        contact_name: '',
        contact_phone: '',
        pallets: '',
        weight_kg: ''
      }
    ]
  });

  // Загрузка водителей и рейсов при монтировании
  useEffect(() => {
    loadDrivers();
    loadTasks();
  }, []);
  const loadDrivers = async () => {
    try {
      const response = await fetch(`${API_URL}/users/drivers`);
      if (response.ok) {
        const data = await response.json();
        setDrivers(data);
      }
      
const deleteTask = async (taskId) => {
  if (!window.confirm('Удалить этот рейс?')) return;
  
  setLoading(true);
  setMessage('');
  
  try {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      setMessage('✅ Рейс удалён');
      loadTasks();
    } else {
      setMessage('❌ Ошибка удаления');
    }
  } catch (error) {
    setMessage('❌ Ошибка сети');
    console.error(error);
  }
  
  setLoading(false);
};
    } catch (error) {
      console.error('Ошибка загрузки водителей:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/tasks/`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки рейсов:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleWaypointChange = (index, field, value) => {
    const newWaypoints = [...formData.waypoints];
    newWaypoints[index] = { ...newWaypoints[index], [field]: value };
    setFormData({ ...formData, waypoints: newWaypoints });
  };

  const addWaypoint = () => {
    setFormData({
      ...formData,
      waypoints: [
        ...formData.waypoints,
        {
          order_num: formData.waypoints.length + 1,
          waypoint_type: 'loading',
          address: '',
          city: '',
          contact_name: '',
          contact_phone: '',
          pallets: '',
          weight_kg: ''
        }
      ]
    });
  };

  const removeWaypoint = (index) => {
    if (formData.waypoints.length <= 2) return;
    const newWaypoints = formData.waypoints.filter((_, i) => i !== index);
    setFormData({ ...formData, waypoints: newWaypoints });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Подготавливаем данные
      const taskData = {
        driver_id: parseInt(formData.driver_id),
        sender: formData.sender,
        receiver: formData.receiver,
        payer: formData.payer,
        delivery_city: formData.delivery_city,
        waypoints: formData.waypoints.map((wp, index) => ({
          order_num: index + 1,
          waypoint_type: wp.waypoint_type,
          address: wp.address,
          city: wp.city,
          contact_name: wp.contact_name,
          contact_phone: wp.contact_phone,
          pallets: wp.pallets ? parseInt(wp.pallets) : null,
          weight_kg: wp.weight_kg ? parseInt(wp.weight_kg) : null
        }))
      };

      const response = await fetch(`${API_URL}/tasks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      if (response.ok) {
        setMessage('✅ Рейс успешно создан!');
        // Сброс формы
        setFormData({
          driver_id: '',
          sender: '',
          receiver: '',
          payer: '',
          delivery_city: '',
          waypoints: [
            { order_num: 1, waypoint_type: 'loading', address: '', city: '', contact_name: '', contact_phone: '', pallets: '', weight_kg: '' },
            { order_num: 2, waypoint_type: 'unloading', address: '', city: '', contact_name: '', contact_phone: '', pallets: '', weight_kg: '' }
          ]
        });
        loadTasks(); // Обновляем список
      } else {
        const errorData = await response.json();
        setMessage(`❌ Ошибка: ${errorData.detail || 'Не удалось создать рейс'}`);
      }
    } catch (error) {
      setMessage('❌ Ошибка сети. Попробуйте позже.');
      console.error(error);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h2>💼 Панель логиста</h2>
      <p>Привет, {user.full_name}!</p>

      {/* Форма создания рейса */}
      <div className="card" style={{ marginBottom: 30 }}>
        <h3>🚛 Создать новый рейс</h3>
        
        {message && (
          <div style={{ 
            padding: 10, 
            marginBottom: 15, 
            background: message.includes('✅') ? '#d4edda' : '#f8d7da',
            borderRadius: 4
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Выбор водителя */}
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
              Водитель *
            </label>
            <select
              name="driver_id"
              value={formData.driver_id}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: 8 }}
            >
              <option value="">-- Выберите водителя --</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name} ({driver.phone || 'нет телефона'})
                </option>
              ))}
            </select>
            {drivers.length === 0 && (
              <small style={{ color: '#666' }}>
                Водителей пока нет. Добавьте водителя через Telegram-бота.
              </small>
            )}
          </div>

          {/* Основная информация */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 15 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Отправитель *</label>
              <input
                type="text"
                name="sender"
                value={formData.sender}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: 8 }}
                placeholder="Название компании"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Получатель *</label>
              <input
                type="text"
                name="receiver"
                value={formData.receiver}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: 8 }}
                placeholder="Название компании"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Плательщик *</label>
              <input
                type="text"
                name="payer"
                value={formData.payer}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: 8 }}
                placeholder="Кто оплачивает"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Город доставки *</label>
              <input
                type="text"
                name="delivery_city"
                value={formData.delivery_city}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: 8 }}
                placeholder="Город"
              />
            </div>
          </div>

          {/* Точки маршрута */}
          <h4>📍 Точки маршрута</h4>
          {formData.waypoints.map((wp, index) => (
            <div key={index} style={{ 
              border: '1px solid #ddd', 
              padding: 15, 
              marginBottom: 10, 
              borderRadius: 4,
              background: '#fafafa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <strong>Точка #{index + 1}</strong>
                {formData.waypoints.length > 2 && (
                  <button 
                    type="button" 
                    onClick={() => removeWaypoint(index)}
                    style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Удалить
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 5 }}>Тип точки</label>
                  <select
                    value={wp.waypoint_type}
                    onChange={(e) => handleWaypointChange(index, 'waypoint_type', e.target.value)}
                    style={{ width: '100%', padding: 8 }}
                  >
                    <option value="loading">Погрузка</option>
                    <option value="unloading">Выгрузка</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5 }}>Город</label>
                  <input
                    type="text"
                    value={wp.city}
                    onChange={(e) => handleWaypointChange(index, 'city', e.target.value)}
                    style={{ width: '100%', padding: 8 }}
                    placeholder="Город"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: 5 }}>Адрес *</label>
                  <input
                    type="text"
                    value={wp.address}
                    onChange={(e) => handleWaypointChange(index, 'address', e.target.value)}
                    required
                    style={{ width: '100%', padding: 8 }}
                    placeholder="Улица, дом"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5 }}>Контактное лицо</label>
                  <input
                    type="text"
                    value={wp.contact_name}
                    onChange={(e) => handleWaypointChange(index, 'contact_name', e.target.value)}
                    style={{ width: '100%', padding: 8 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5 }}>Телефон</label>
                  <input
                    type="text"
                    value={wp.contact_phone}
                    onChange={(e) => handleWaypointChange(index, 'contact_phone', e.target.value)}
                    style={{ width: '100%', padding: 8 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5 }}>Паллеты</label>
                  <input
                    type="number"
                    value={wp.pallets}
                    onChange={(e) => handleWaypointChange(index, 'pallets', e.target.value)}
                    style={{ width: '100%', padding: 8 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5 }}>Вес (кг)</label>
                  <input
                    type="number"
                    value={wp.weight_kg}
                    onChange={(e) => handleWaypointChange(index, 'weight_kg', e.target.value)}
                    style={{ width: '100%', padding: 8 }}
                  />
                </div>
              </div>
            </div>
          ))}

          <button 
            type="button" 
            onClick={addWaypoint}
            style={{ 
              marginBottom: 15, 
              padding: '8px 16px', 
              background: '#f0f0f0', 
              border: '1px solid #ccc',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            + Добавить точку маршрута
          </button>

          <button 
            type="submit" 
            disabled={loading || !formData.driver_id}
            style={{ 
              width: '100%', 
              padding: 12, 
              background: loading ? '#ccc' : '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4,
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Создание...' : 'Создать рейс'}
          </button>
        </form>
      </div>

      {/* Список активных рейсов */}
      <div className="card">
        <h3>📋 Активные рейсы</h3>
        {tasks.length === 0 ? (
          <p>Рейсов пока нет</p>
        ) : (
          tasks.map(task => (
            <div key={task.id} style={{ 
              border: '1px solid #ddd', 
              padding: 10, 
              marginBottom: 10, 
              borderRadius: 4 
            }}>
              <strong>Рейс #{task.id}</strong>
              <p>От: {task.sender} → До: {task.receiver}</p>
              <p>Город: {task.delivery_city} | Статус: {task.status}</p>
              <button
  onClick={() => deleteTask(task.id)}
  disabled={loading}
  style={{
    padding: '6px 12px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    cursor: loading ? 'not-allowed' : 'pointer',
    fontSize: 13,
    marginTop: 8
  }}
>
  ️ Удалить
</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
