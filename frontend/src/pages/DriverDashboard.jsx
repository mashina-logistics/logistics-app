import React, { useState, useEffect } from 'react';
import Chat from '../components/Chat';

const API_URL = import.meta.env.VITE_API_URL || 'https://logistics-app-production-e4a3.up.railway.app';

export default function DriverDashboard({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Загрузка рейсов при монтировании
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/tasks/`);
      if (response.ok) {
        const data = await response.json();
        // Фильтруем рейсы для текущего водителя
        const driverTasks = data.filter(task => task.driver_id === user.id);
        setTasks(driverTasks);
      }
    } catch (error) {
      console.error('Ошибка загрузки рейсов:', error);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setMessage(`✅ Статус обновлён: ${newStatus}`);
        loadTasks();
      } else {
        setMessage('❌ Ошибка обновления статуса');
      }
    } catch (error) {
      setMessage('❌ Ошибка сети');
      console.error(error);
    }

    setLoading(false);
  };

  const handleFileUpload = async (e, taskId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('task_id', taskId);

    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/upload-document`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setMessage('✅ Документ загружен!');
      } else {
        setMessage('❌ Ошибка загрузки документа');
      }
    } catch (error) {
      setMessage('❌ Ошибка сети');
      console.error(error);
    }

    setUploading(false);
  };
const updateWaypointStatus = async (taskId, waypointId, status) => {
  setLoading(true);
  setMessage('');
  
  try {
    const response = await fetch(
      `${API_URL}/tasks/${taskId}/waypoint/${waypointId}/status?status=${status}`,
      { method: 'POST' }
    );
    
    if (response.ok) {
      setMessage('✅ Статус точки обновлён!');
      loadTasks();
    } else {
      setMessage('❌ Ошибка обновления статуса');
    }
  } catch (error) {
    setMessage('❌ Ошибка сети');
    console.error(error);
  }
  
  setLoading(false);
};
  const getStatusColor = (status) => {
    const colors = {
      'new': '#3498db',
      'in_progress': '#f39c12',
      'completed': '#27ae60',
      'cancelled': '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  const getStatusText = (status) => {
    const texts = {
      'new': 'Новый',
      'in_progress': 'В пути',
      'completed': 'Завершён',
      'cancelled': 'Отменён'
    };
    return texts[status] || status;
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h2>🚚 Панель водителя</h2>
      <p>Привет, {user.full_name}!</p>

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

      {/* Список рейсов */}
      <div className="card">
        <h3> Мои рейсы</h3>
        {tasks.length === 0 ? (
          <p>У вас пока нет рейсов</p>
        ) : (
          tasks.map(task => (
            <div key={task.id} style={{ 
              border: '2px solid ' + getStatusColor(task.status),
              padding: 15, 
              marginBottom: 15, 
              borderRadius: 8,
              background: '#fafafa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ margin: 0 }}>Рейс #{task.id}</h4>
                <span style={{ 
                  padding: '4px 12px', 
                  background: getStatusColor(task.status),
                  color: 'white',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 'bold'
                }}>
                  {getStatusText(task.status)}
                </span>
              </div>

              <p><strong>От:</strong> {task.sender}</p>
              <p><strong>До:</strong> {task.receiver}</p>
              <p><strong>Город:</strong> {task.delivery_city}</p>
              <p><strong>Плательщик:</strong> {task.payer}</p>

              {/* Точки маршрута */}
              <div style={{ marginTop: 15 }}>
                <strong> Точки маршрута:</strong>
                {task.waypoints && task.waypoints.map((wp, index) => (
                  <div key={index} style={{ 
                    marginLeft: 20, 
                    marginTop: 10, 
                    padding: 10,
                    background: 'white',
                    borderRadius: 4,
                    borderLeft: '3px solid ' + (wp.waypoint_type === 'loading' ? '#27ae60' : '#e74c3c')
                  }}>
                    <strong>{wp.waypoint_type === 'loading' ? ' Погрузка' : '📤 Выгрузка'} #{wp.order_num}</strong>
                    <p style={{ margin: '5px 0' }}>{wp.city}, {wp.address}</p>
                    {wp.contact_name && <p style={{ margin: '5px 0', fontSize: 14, color: '#666' }}>
                      Контакт: {wp.contact_name} ({wp.contact_phone})
                    </p>}
                    {(wp.pallets || wp.weight_kg) && (
                      <p style={{ margin: '5px 0', fontSize: 14, color: '#666' }}>
                        {wp.pallets && `${wp.pallets} паллет`}
                        {wp.pallets && wp.weight_kg && ' | '}
                        {wp.weight_kg && `${wp.weight_kg} кг`}
                      </p>
                    )}
                    {/* Кнопки управления статусом точки */}
<div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
  {!wp.arrived_at && (
    <button
      onClick={() => updateWaypointStatus(task.id, wp.id, 'arrived')}
      disabled={loading}
      style={{
        padding: '6px 12px',
        background: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: 4,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: 13
      }}
    >
      📍 Прибыл
    </button>
  )}
  
  {wp.arrived_at && !wp.started_at && (
    <button
      onClick={() => updateWaypointStatus(task.id, wp.id, 'started')}
      disabled={loading}
      style={{
        padding: '6px 12px',
        background: '#ffc107',
        color: '#000',
        border: 'none',
        borderRadius: 4,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: 13
      }}
    >
      🔄 Начал {wp.waypoint_type === 'loading' ? 'погрузку' : 'выгрузку'}
    </button>
  )}
  
  {wp.started_at && !wp.completed_at && (
    <button
      onClick={() => updateWaypointStatus(task.id, wp.id, 'completed')}
      disabled={loading}
      style={{
        padding: '6px 12px',
        background: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: 4,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: 13
      }}
    >
      ✅ Завершил
    </button>
  )}
  
  {wp.completed_at && (
    <span style={{
      padding: '6px 12px',
      background: '#28a745',
      color: 'white',
      borderRadius: 4,
      fontSize: 13
    }}>
      ✅ Выполнено
    </span>
  )}
</div>
                  </div>
              <Chat taskId={task.id} userId={user?.id} userRole="driver" />
                ))}
              </div>

              {/* Кнопки управления статусом */}
              {task.status === 'new' && (
                <button 
                  onClick={() => updateTaskStatus(task.id, 'in_progress')}
                  disabled={loading}
                  style={{ 
                    marginTop: 15,
                    padding: '10px 20px',
                    background: '#f39c12',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 14
                  }}
                >
                  🚀 Начать рейс
                </button>
              )}

              {task.status === 'in_progress' && (
                <button 
                  onClick={() => updateTaskStatus(task.id, 'completed')}
                  disabled={loading}
                  style={{ 
                    marginTop: 15,
                    padding: '10px 20px',
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 14
                  }}
                >
                  ✅ Завершить рейс
                </button>
              )}

              {/* Загрузка документов */}
              <div style={{ marginTop: 15, padding: 15, background: 'white', borderRadius: 4 }}>
                <strong>📎 Загрузить документы:</strong>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileUpload(e, task.id)}
                  disabled={uploading}
                  style={{ marginTop: 10, width: '100%' }}
                />
                <small style={{ color: '#666', display: 'block', marginTop: 5 }}>
                  Можно загрузить фото накладных, чеков и т.д.
                </small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
