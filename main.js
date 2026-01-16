const { app, BrowserWindow, ipcMain } = require('electron');

const fs = require('fs');
const path = require('path');

let win;
let isPinned = true;

function createWindow() {
  win = new BrowserWindow({
    width: 420,  // Tamaño inicial
    height: 240, 
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true, // Debe ser true para que el método setSize funcione internamente
    useContentSize: true, // Esto hace que el tamaño ignore los bordes de la ventana
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

// --- NUEVO: Escuchar el cambio de tamaño ---
ipcMain.on('resize-window', (event, { width, height }) => {
  if (win) {
    // Añadimos un pequeño margen extra para que no se corte la sombra
    win.setSize(width, height, true); 
  }
});

ipcMain.on('close-window', () => app.quit());

ipcMain.on('toggle-pin', () => {
  isPinned = !isPinned;
  win.setAlwaysOnTop(isPinned);
  // win.setMovable(!isPinned); // Opcional: si quieres bloquear movimiento
});

// En main.js, añade estas escuchas:

ipcMain.on('verse-selected', (event, data) => {
    // Reenviamos los datos de la ventana de búsqueda a la ventana principal
    win.webContents.send('load-this-verse', data);
});

ipcMain.on('custom-selected', (event, data) => {
    // Reenviamos la cita personalizada a la ventana principal
    win.webContents.send('load-this-custom', data);
});
// ... (resto de tu código de ventanas de búsqueda y custom)

let searchWin;
let customWin;

ipcMain.on('open-search', () => {
  if (searchWin) return;

    searchWin = new BrowserWindow({
        width: 400,
        height: 500,
        frame: false,       // Sin bordes de Windows
        transparent: true,  // Para que se vea el diseño redondeado
        alwaysOnTop: true,  // Para que no quede detrás de la principal
        resizable: false,
        center: true,       // <--- FUERZA EL CENTRO DE LA PANTALLA
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    searchWin.loadFile('search.html');
    searchWin.on('closed', () => searchWin = null);
});

ipcMain.on('open-custom', () => {
  if (customWin) return;

  customWin = new BrowserWindow({
    width: 360,
    height: 420,
    parent: win,
    frame: false,       // Sin bordes de Windows
        transparent: true,  // Para que se vea el diseño redondeado
        alwaysOnTop: true,  // Para que no quede detrás de la principal
        resizable: false,
        center: true,       // <--- FUERZA EL CENTRO DE LA PANTALLA
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

  customWin.loadFile('custom.html');
  customWin.on('closed', () => customWin = null);
});

ipcMain.on('save-and-use-custom', (event, newQuote) => {
    const filePath = path.join(__dirname, 'bible.json');

    // 1. Leer lo que ya existe
    fs.readFile(filePath, 'utf8', (err, data) => {
        let json = [];
        if (!err) {
            const content = JSON.parse(data);
            json = Array.isArray(content) ? content : [content];
        }

        // 2. Agregar la nueva cita
        json.push(newQuote);

        // 3. Guardar de nuevo en el archivo
        fs.writeFile(filePath, JSON.stringify(json, null, 2), (err) => {
            if (err) console.error("Error al guardar:", err);
            
            // 4. Enviar a la ventana principal para mostrarla de inmediato
            win.webContents.send('load-this-custom', newQuote);
        });
    });
});

app.whenReady().then(createWindow);

