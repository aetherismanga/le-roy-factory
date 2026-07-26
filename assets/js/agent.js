.dashboard-body {
  background-color: #F8F6F2;
  color: #2F2F2F;
  margin: 0;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.dashboard-header {
  background: #FFFFFF;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
}

.dashboard-nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dashboard-header .logo {
  font-weight: 800;
  font-size: 1.25rem;
  color: #1A2530;
  text-decoration: none;
  letter-spacing: 0.05em;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

#user-greeting {
  font-weight: 600;
  color: #1A2530;
  font-size: 0.95rem;
}

.btn-logout {
  background: transparent;
  border: 1px solid #D1D5DB;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  color: #4B5563;
  transition: all 0.2s;
}

.btn-logout:hover {
  background-color: #F3F4F6;
  color: #111111;
  border-color: #9CA3AF;
}

.dashboard-main {
  margin-top: 80px;
  flex: 1;
  padding: 3rem 2rem;
}

.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-welcome {
  margin-bottom: 2.5rem;
}

.dashboard-welcome h1 {
  font-size: 2rem;
  color: #1A2530;
  margin: 0 0 0.5rem 0;
}

.dashboard-welcome p {
  color: #666;
  font-size: 0.95rem;
  margin: 0;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.dash-card {
  background: #FFFFFF;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  padding: 1.75rem;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
}

.dash-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
  border-color: rgba(212, 175, 55, 0.3);
}

.card-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.dash-card h3 {
  font-size: 1.15rem;
  color: #1A2530;
  margin: 0 0 0.5rem 0;
}

.dash-card p {
  font-size: 0.85rem;
  color: #666;
  margin: 0;
}

@media (max-width: 768px) {
  .dashboard-main {
    padding: 1.5rem 1rem;
  }
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
