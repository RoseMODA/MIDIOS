const { ipcRenderer } = require('electron');

const quoteDiv = document.getElementById('quote');
const menu = document.getElementById('menu');

const searchModal = document.getElementById('searchModal');
const customModal = document.getElementById('customModal');

const STORAGE_KEY = 'dailyVerseIndex';
const STORAGE_DATE = 'dailyVerseDate';
const THEME_KEY = 'theme';

// =================== UTIL ===================
function fadeChange(callback) {
  quoteDiv.classList.add('fade-out');
  setTimeout(() => {
    callback();
    quoteDiv.classList.remove('fade-out');
    quoteDiv.classList.add('fade-in');
    setTimeout(() => quoteDiv.classList.remove('fade-in'), 300);
  }, 200);
}

function renderQuote(text, reference) {
  quoteDiv.innerHTML = `
    <div class="verse-text">“${text}”</div>
    <div class="verse-ref">${reference}</div>
  `;
}

// =================== CITA PERSONALIZADA ===================
async function loadCustomQuote() {
  const res = await fetch('bible.json');
  const data = await res.json();
  renderQuote(data.text, data.reference);
}

// =================== VERSO DIARIO ===================
async function loadDailyVerse() {
  const res = await fetch('SpanishBLPHBible.json');
  const data = await res.json();
  const verses = data.verses;

  const today = new Date().toDateString();
  let index = localStorage.getItem(STORAGE_KEY);
  let savedDate = localStorage.getItem(STORAGE_DATE);

  if (!index || savedDate !== today) {
    index = Math.floor(Math.random() * verses.length);
    localStorage.setItem(STORAGE_KEY, index);
    localStorage.setItem(STORAGE_DATE, today);
  }

  const v = verses[index];
  renderQuote(v.text, `${v.book_name} ${v.chapter}:${v.verse}`);
}

async function loadRandomVerse() {
  const res = await fetch('SpanishBLPHBible.json');
  const data = await res.json();
  const verses = data.verses;

  const index = Math.floor(Math.random() * verses.length);
  const v = verses[index];

  renderQuote(v.text, `${v.book_name} ${v.chapter}:${v.verse}`);
}


// =================== BUSCADOR ===================
async function searchVerse(book, chapter, verse) {
  const res = await fetch('SpanishBLPHBible.json');
  const data = await res.json();

  const found = data.verses.find(v =>
    v.book_name.toLowerCase() === book.toLowerCase() &&
    v.chapter == chapter &&
    v.verse == verse
  );

  if (found) {
    fadeChange(() =>
      renderQuote(found.text, `${found.book_name} ${found.chapter}:${found.verse}`)
    );
  } else {
    alert('Verso no encontrado');
  }
}

// =================== MODOS ===================
function toggleTheme() {
  document.body.classList.toggle('dark');
  localStorage.setItem(THEME_KEY,
    document.body.classList.contains('dark') ? 'dark' : 'light'
  );
}

// =================== EVENTOS ===================
document.getElementById('closeBtn').onclick = () =>
  ipcRenderer.send('close-window');

document.getElementById('pinBtn').onclick = () =>
  ipcRenderer.send('toggle-pin');

document.getElementById('menuBtn').onclick = () =>
  menu.classList.toggle('open');


document.getElementById('randomVerse').onclick = () => {
  fadeChange(loadRandomVerse);
  menu.classList.remove('open');
};

document.getElementById('searchVerse').onclick = () => {
  searchModal.classList.add('open');
  menu.classList.remove('open');
};

document.getElementById('customQuote').onclick = () => {
  customModal.classList.add('open');
  menu.classList.remove('open');
};

document.getElementById('searchVerse').onclick = () => {
    ipcRenderer.send('open-search');
    menu.classList.remove('open'); // <--- Cierra el menú
    ajustarVentana(); // <--- Reajusta el tamaño de la ventana principal
};

document.getElementById('customQuote').onclick = () => {
    ipcRenderer.send('open-custom');
    menu.classList.remove('open'); // <--- Cierra el menú
    ajustarVentana();
};


document.getElementById('toggleTheme').onclick = () => {
  toggleTheme();
  menu.classList.remove('open');
  ajustarVentana();
};

// =================== MODALES ===================
document.querySelectorAll('.modal-close').forEach(btn =>
  btn.onclick = () => btn.closest('.modal').classList.remove('open')
);

document.getElementById('searchConfirm').onclick = () => {
  const b = bookInput.value;
  const c = chapterInput.value;
  const v = verseInput.value;
  searchModal.classList.remove('open');
  fadeChange(() => searchVerse(b, c, v));
};

// =================== INIT ===================
if (localStorage.getItem(THEME_KEY) === 'dark') {
  document.body.classList.add('dark');
}

loadDailyVerse();

function ajustarVentana() {
    setTimeout(() => {
        // Obtenemos el elemento principal que envuelve todo (la card)
        const container = document.querySelector('.card');
        if (container) {
            const width = Math.ceil(container.offsetWidth);
            const height = Math.ceil(container.offsetHeight);

            // Enviamos los datos al Main Process
            ipcRenderer.send('resize-window', { width, height });
        }
    }, 150); // Un pequeño delay para que la animación fade-in termine
}

// --- IMPORTANTE: Llama a ajustarVentana donde el contenido cambie ---

// 1. En renderQuote para que se ajuste al cargar el verso
function renderQuote(text, reference) {
  quoteDiv.innerHTML = `
    <div class="verse-text">“${text}”</div>
    <div class="verse-ref">${reference}</div>
  `;
  ajustarVentana(); // <--- Llamada aquí
}

// 2. Al abrir o cerrar el menú
document.getElementById('menuBtn').onclick = () => {
  menu.classList.toggle('open');
  ajustarVentana(); // <--- Llamada aquí
};

// 3. Al iniciar
window.addEventListener('load', ajustarVentana);

// En renderer.js, añade esto al final:

ipcRenderer.on('load-this-verse', (event, { book, chapter, verse }) => {
    searchVerse(book, chapter, verse);
});

ipcRenderer.on('load-this-custom', (event, data) => {
    fadeChange(() => renderQuote(data.text, data.reference));
});


let timerInterval = null;
let secondsElapsed = 0;
let isTimerRunning = false;
let currentMode = null; // 'cron' o 'temp'

const timerContainer = document.getElementById('timer-container');
const timerDisplay = document.getElementById('timer-display');
const closeTimer = document.getElementById('close-timer');

// Sonidos (Opcional: asegúrate de tener los archivos)
const tickSound = new Audio('tick.mp3'); 
const alarmSound = new Audio('alarm.mp3');

function updateDisplay(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const mDisplay = minutes.toString().padStart(2, '0');
    const sDisplay = seconds.toString().padStart(2, '0');

    if (hours > 0) {
        // Si hay horas, mostramos HH:MM:SS
        const hDisplay = hours.toString().padStart(2, '0');
        timerDisplay.innerText = `${hDisplay}:${mDisplay}:${sDisplay}`;
    } else {
        // Si no hay horas, mostramos solo MM:SS (como el 15:00 que pides)
        timerDisplay.innerText = `${mDisplay}:${sDisplay}`;
    }
}



function startLogic() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        // Opcional: pausar el sonido de la alarma si se detiene manualmente
        alarmSound.pause();
        alarmSound.currentTime = 0;
    } else {
        timerInterval = setInterval(() => {
            if (currentMode === 'cron') {
                secondsElapsed++;
                
                // Suena cada vez que se completa un minuto exacto (60, 120, 180...)
                if (secondsElapsed > 0 && secondsElapsed % 60 === 0) {
                    tickSound.play().catch(() => {});
                }
                
            } else {
                secondsElapsed--;

                // Lógica del Temporizador:
                // 1. Sonido cada minuto (si quedan más de 60 segundos)
                if (secondsElapsed > 60 && secondsElapsed % 60 === 0) {
                    tickSound.play().catch(() => {});
                }

                // 2. Alarma en los últimos 16 segundos
                if (secondsElapsed <= 16 && secondsElapsed > 0) {
                    alarmSound.play().catch(() => {});
                }

                // 3. Finalización (Sin alert)
                if (secondsElapsed <= 0) {
                    clearInterval(timerInterval);
                    isTimerRunning = false;
                    // Aseguramos que suene al llegar a cero una última vez o se mantenga
                    alarmSound.play().catch(() => {});
                }
            }
            updateDisplay(secondsElapsed);
        }, 1000);
    }
    isTimerRunning = !isTimerRunning;
}

// Eventos de Menú
document.getElementById('startCron').onclick = () => {
    currentMode = 'cron';
    secondsElapsed = 0;
    showTimer();
};

document.getElementById('startTemp').onclick = () => {
    currentMode = 'temp';
    secondsElapsed = 15 * 60; // 15 minutos
    showTimer();
};

function showTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    updateDisplay(secondsElapsed);
    timerContainer.style.display = 'block';
    menu.classList.remove('open');
    ajustarVentana();
}

// Click en los números (Play/Pause)
timerDisplay.onclick = startLogic;

// Cerrar Timer
closeTimer.onclick = () => {
    clearInterval(timerInterval);
    timerContainer.style.display = 'none';
    isTimerRunning = false;
    ajustarVentana();
};