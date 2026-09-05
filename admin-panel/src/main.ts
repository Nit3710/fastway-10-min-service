import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const root = document.getElementById('app');

if (!root) {
  throw new Error('Admin app root element was not found');
}

createRoot(root).render(createElement(App));
