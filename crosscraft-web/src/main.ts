import { CrossCraftApplet } from './CrossCraftApplet';

// Находим элемент на странице, куда будет встроен "апплет"
const appContainer = document.getElementById('app');

if (appContainer) {
    // Создаем и запускаем наш апплет
    const applet = new CrossCraftApplet(appContainer);
    applet.start();
} else {
    console.error("Application container #app not found!");
}
