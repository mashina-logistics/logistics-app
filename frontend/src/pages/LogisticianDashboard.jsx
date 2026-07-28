import React, { useState, useEffect } from 'react';

export default function LogisticianDashboard({ user }) {
  return (
    <div>
      <h2>👨💼 Панель логиста</h2>
      <div className="card">
        <p>Привет, {user.full_name}!</p>
        <p>Здесь будет форма создания рейсов</p>
      </div>
    </div>
  );
}