import {createRoot} from 'react-dom/client';
import {HashRouter} from 'react-router-dom';
import {MotionConfig} from 'motion/react';
import App from './App';
import './styles.css';

window.history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')!).render(
  <HashRouter><MotionConfig reducedMotion="user"><App /></MotionConfig></HashRouter>,
);