const { app, ipcMain, BrowserWindow } = require('electron')
const fs = require('fs')

var workload = JSON.parse(fs.readFileSync('workload.json'))

app.on('ready', () => {
    window = new BrowserWindow({
        title: 'Visualizing Tracing Content',
        webPreferences: { nodeIntegration: true }
    })
    window.loadFile('trace_app.html')
})

ipcMain.on("asynchronous-message", async (event, arg) => {

})