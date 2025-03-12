
import React from 'react';
import DateslidesDashboard from './dateslides-dashboard';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">DateSlides Manager</div>
        <nav>
          <ul>
            <li><a href="/" className="active">Dashboard</a></li>
            <li><a href="/reports">Reports</a></li>
            <li><a href="/settings">Settings</a></li>
          </ul>
        </nav>
        <div className="user-profile">
          <span className="user-name">User</span>
          <div className="avatar">👤</div>
        </div>
      </header>
      
      <main className="app-content">
        <DateslidesDashboard />
      </main>
      
      <footer className="app-footer">
        <p>© 2023 DateSlides Manager. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
