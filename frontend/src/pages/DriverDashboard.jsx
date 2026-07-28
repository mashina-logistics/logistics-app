import React from 'react';

export default function DriverDashboard({ user }) {
  return (
    <div>
      <h2>🚛 Привет, {user.full_name}</h2>
      <div className="card">
        <p>Здесь будут ваши рейсы</p>
      </div>
    </div>
  );
}