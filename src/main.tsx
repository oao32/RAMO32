import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyThemeToDocument, getStoredTheme } from './lib/themeUtils';

applyThemeToDocument(getStoredTheme());

createRoot(document.getElementById('root')!).render(<App />);
