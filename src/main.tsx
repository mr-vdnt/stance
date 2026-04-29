import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite HMR WebSocket and Firestore transport errors
const isBenignError = (message: string) => {
  const msg = message.toLowerCase();
  return (
    msg.includes('websocket') || 
    msg.includes('vite') || 
    msg.includes('webchannelconnection') || 
    msg.includes('transport errored')
  );
};

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = (reason instanceof Error ? reason.message : String(reason)) || '';
  if (isBenignError(message)) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const message = event.message || '';
  if (isBenignError(message)) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
}, true);

// Intercept console.error and console.warn for these specific benign messages
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  const message = args.map(arg => String(arg)).join(' ');
  if (isBenignError(message)) return;
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  const message = args.map(arg => String(arg)).join(' ');
  if (isBenignError(message)) return;
  originalConsoleWarn.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
