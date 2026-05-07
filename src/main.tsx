import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupPWA, setupNetworkListeners } from './utils/pwa-setup'

// Khởi tạo PWA & Service Worker
setupPWA();
setupNetworkListeners();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
