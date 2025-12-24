
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

// Đăng ký Service Worker từ thư mục public
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/public/sw.js').then(registration => {
      console.log('PWA ServiceWorker registered');
    }).catch(err => {
      console.log('PWA ServiceWorker registration failed: ', err);
    });
  });
}
