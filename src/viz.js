const { app, ipcMain, BrowserWindow } = require('electron')
const fs = require('fs')
const util = require('./rr_util')

const folder = 'tmp'

var paint_contents = []
var page_composition = []
var metadata = JSON.parse(fs.readFileSync(`${folder}/metadata.json`))

for (var i = 0; i < metadata.count; i++) {
    if (fs.existsSync(`${folder}/dom-${i + 1}.json`) && fs.existsSync(`${folder}/paint-${i + 1}.json`)) {
        var dom = util.parseDomSnapshot(JSON.parse(fs.readFileSync(`${folder}/dom-${i + 1}.json`)))
        var paint = util.parsePaintLog(dom, JSON.parse(fs.readFileSync(`${folder}/paint-${i + 1}.json`)))
        paint_contents.push(paint)
        dom = undefined;
        paint = undefined
    } else {
        paint_contents.push([]);
    }
}

page_composition = util.getPageComposition(paint_contents)

var maxWidth = maxHeight = 0
page_composition.forEach(log => {
    log.forEach(m => {
        if (m.region.right > maxWidth) maxWidth = m.region.right
        if (m.region.bottom > maxHeight) maxHeight = m.region.bottom
    })
})

app.on('ready', () => {
    window = new BrowserWindow({
        title: 'Visualizing Paint Content',
        webPreferences: { nodeIntegration: true }
    })
    window.loadFile('app.html')
})

ipcMain.on("asynchronous-message", async (event, arg) => {
    switch (arg.name) {
        case "START":
            event.reply('asynchronous-reply', {
                name: "START",
                value: { maxWidth, maxHeight, count: metadata.count }
            })
            break
        case "CONTENT":
            index = arg.index
            if (index < page_composition.length && page_composition[index]) {
                page_composition[index].forEach(m => {
                    event.reply('asynchronous-reply', { name: "CONTENT", method: m })
                })
            }
            break
    }
})