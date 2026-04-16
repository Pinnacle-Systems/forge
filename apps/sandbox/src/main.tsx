import React from 'react';
import ReactDOM from 'react-dom/client';
import { SandboxApp } from './SandboxApp';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SandboxApp />
  </React.StrictMode>,
);
