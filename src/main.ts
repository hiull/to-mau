import './styles.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

const app = document.getElementById('app')!;
app.textContent = 'Tô Màu';
