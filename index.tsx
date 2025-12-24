
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Đăng ký Service Worker với logic bảo mật Origin
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Tạo URL tuyệt đối cho sw.js dựa trên vị trí hiện tại của trang web
    // Việc này ngăn chặn trình duyệt hiểu nhầm origin là https://ai.studio
    const swUrl = new URL('sw.js', window.location.href).href;
    
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('PWA ServiceWorker registered with scope:', registration.scope);
        
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('New content available, please refresh.');
                } else {
                  console.log('Content cached for offline use.');
                }
              }
            };
          }
        };
      })
      .catch(err => {
        console.error('PWA ServiceWorker registration failed:', err);
      });
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
