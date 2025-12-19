import React from 'react';
import { Link } from 'react-router-dom';

const ForbiddenPage = () => (
  <div>
    <h1>403 Доступ запрещен</h1>
    <p>У вас нет прав для просмотра этой страницы.</p>
    <Link to="/dashboard">На главную</Link>
  </div>
);

export default ForbiddenPage;
