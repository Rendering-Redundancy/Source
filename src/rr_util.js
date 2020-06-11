const crypto = require('crypto')
const delay = require('delay')
const EventEmitter = require('events')
const fs = require('fs')
const puppeteer = require('puppeteer')

const nodeTypes = [
    "",
    "ELEMENT_NODE",
    "",
    "TEXT_NODE",
    "CDATA_SECTION_NODE",
    "",
    "",
    "PROCESSING_INSTRUCTION_NODE",
    "COMMENT_NODE",
    "DOCUMENT_NODE",
    "DOCUMENT_TYPE_NODE",
    "DOCUMENT_FRAGMENT_NODE"
]

const textTypes = ["TEXT_NODE", "textarea", "input"]

function indexToValue(idx, list) {
    if (idx instanceof Array) {
        return idx.reduce((prev, cur) => {
            prev.push(cur === -1 ? "" : list[cur])
            return prev
        }, [])
    } else {
        return idx === -1 ? "" : list[idx]
    }
}

function parseDomSnapshot(dom, mode) {
    var documents = dom.documents
    var stringReference = dom.strings

    var texts = []
    var images = []
    var parsedNodes = []
    for (var i = 0; i < documents.length; i++) {
        parsedNodes.push([])
        var d = documents[i]

        for (var j = 0; j < d.nodes.parentIndex.length; j++) {
            var index = j
            var parentIndex = d.nodes.parentIndex[j]
            var backendId = d.nodes.backendNodeId[j]
            var nodeType = nodeTypes[d.nodes.nodeType[j]]
            var nodeName = indexToValue(d.nodes.nodeName[j], stringReference)
            var nodeValue = indexToValue(d.nodes.nodeValue[j], stringReference)
            var attributes = indexToValue(d.nodes.attributes[j], stringReference)

            parsedNodes[i].push({ index, backendId, parentIndex, nodeType, nodeName, nodeValue, attributes })
        }

        for (var j = 0; j < d.nodes.textValue.index.length; j++) {
            var index = d.nodes.textValue.index[j]
            parsedNodes[i][index].nodeType = "textarea"
            parsedNodes[i][index].textValue = indexToValue(d.nodes.textValue.value[j], stringReference)
        }

        for (var j = 0; j < d.nodes.inputValue.index.length; j++) {
            var index = d.nodes.inputValue.index[j]
            parsedNodes[i][index].nodeType = "input"
            parsedNodes[i][index].inputValue = indexToValue(d.nodes.inputValue.value[j], stringReference)
        }

        for (var j = 0; j < d.nodes.currentSourceURL.index.length; j++) {
            var index = d.nodes.currentSourceURL.index[j]
            parsedNodes[i][index].currentSourceURL = indexToValue(d.nodes.currentSourceURL.value[j], stringReference)
        }

        for (var j = 0; j < d.layout.nodeIndex.length; j++) {
            var index = d.layout.nodeIndex[j]
            parsedNodes[i][index].inLayout = true
            parsedNodes[i][index].styles = indexToValue(d.layout.styles[j], stringReference)
            parsedNodes[i][index].bounds = d.layout.bounds[j]
            parsedNodes[i][index].text = indexToValue(d.layout.text[j], stringReference)
        }

        for (var j = 0; j < d.textBoxes.layoutIndex.length; j++) {
            var index = d.layout.nodeIndex[d.textBoxes.layoutIndex[j]]
            var node = parsedNodes[i][index]
            if (!node.segments) node.segments = []
            node.segments.push({
                value: (node.text || node.nodeValue || node.inputValue || node.textValue).substring(d.textBoxes.start[j], d.textBoxes.start[j] + d.textBoxes.length[j]),
                bounds: d.textBoxes.bounds[j]
            })
        }

        if (mode && moed === 'simple') {
            parsedNodes[i].forEach(n => {
                if (n.inLayout) {
                    if (textTypes.indexOf(n.nodeType) !== -1) {
                        if (n.segments) {
                            n.segments.forEach(seg => {
                                texts.push({
                                    value: seg.value,
                                    bounds: seg.bounds,
                                    fontSize: n.styles[0],
                                    fontFamily: n.styles[1]
                                })
                            })
                        } else {
                            texts.push({
                                value: n.text || n.nodeValue || n.inputValue || n.textValue,
                                bounds: n.bounds,
                                fontSize: n.styles[0],
                                fontFamily: n.styles[1]
                            })
                        }
                    } else if (n.currentSourceURL || (n.styles[2] && n.styles[2] !== 'none')) {
                        var source = n.currentSourceURL || n.styles[2]
                        if (source.startsWith('url')) {
                            source = source.substring(5, source.length - 2)
                        }
                        images.push({
                            source,
                            bounds: n.bounds
                        })
                    }
                }
            })
        }
    }

    if (mode && mode === 'simple') return { texts, images }
    else return parsedNodes
}

function parsePaintLog(dom, paint) {
    var output = []

    if (paint.commandLog) {
        paint.commandLog.forEach(d => {
            switch (d.method) {
                case "drawRect":
                    output.push({
                        type: 'Rect',
                        style: d.params.paint.styleName,
                        color: d.params.paint.color,
                        region: d.params.rect,
                        stroke: d.params.paint.styleName === "Fill" ? undefined : [
                            d.params.paint.strokeWidth,
                            d.params.paint.strokeCap,
                            d.params.paint.strokeJoin,
                            d.params.paint.strokeMiter
                        ]
                    })
                    break
                case "drawRRect":
                    output.push({
                        type: 'RRect',
                        style: d.params.paint.styleName,
                        color: d.params.paint.color,
                        region: d.params.rrect,
                        radius: [
                            d.params.rrect.upperLeftRadius,
                            d.params.rrect.upperRightRadius,
                            d.params.rrect.lowerLeftRadius,
                            d.params.rrect.lowerRightRadius
                        ],
                        radiusType: d.params.rrect.type,
                        stroke: d.params.paint.styleName === "Fill" ? undefined : [
                            d.params.paint.strokeWidth,
                            d.params.paint.strokeCap,
                            d.params.paint.strokeJoin,
                            d.params.paint.strokeMiter
                        ]
                    })
                    break
                case "drawPath":
                    output.push({
                        type: 'Path',
                        style: d.params.paint.styleName,
                        color: d.params.paint.color,
                        region: d.params.path.bounds,
                        pathPoints: d.params.path.pathPoints,
                        fillType: d.params.path.fillType,
                        convexity: d.params.path.convexity,
                        isRect: d.params.path.isRect,
                        stroke: d.params.paint.styleName === "Fill" ? undefined : [
                            d.params.paint.strokeWidth,
                            d.params.paint.strokeCap,
                            d.params.paint.strokeJoin,
                            d.params.paint.strokeMiter
                        ]
                    })
                    break
                case "drawTextBlob":
                    var x = d.params.x
                    var y = d.params.y
                    var textIndex = -1
                    var minDistance = Number.MAX_SAFE_INTEGER

                    for (var i = 0; i < dom.texts.length; i++) {
                        var distance = Math.hypot(x - dom.texts[i].bounds[0], y - dom.texts[i].bounds[1])
                        if (distance < minDistance) {
                            textIndex = i
                            minDistance = distance
                        }
                    }

                    if (0 <= textIndex < dom.texts.length) {
                        output.push({
                            type: 'Text',
                            style: d.params.paint.styleName,
                            color: d.params.paint.color,
                            point: { x, y },
                            region: {
                                left: dom.texts[textIndex].bounds[0],
                                top: dom.texts[textIndex].bounds[1],
                                right: dom.texts[textIndex].bounds[0] + dom.texts[textIndex].bounds[2],
                                bottom: dom.texts[textIndex].bounds[1] + dom.texts[textIndex].bounds[3]
                            },
                            value: dom.texts[textIndex].value,
                            fontSize: dom.texts[textIndex].fontSize,
                            fontFamily: dom.texts[textIndex].fontFamily
                        })
                        dom.texts.splice(textIndex, 1)
                    }
                    break
                case "drawImageRect":
                    var imgIndex = -1
                    var minDistance = Number.MAX_SAFE_INTEGER

                    var region = d.params.dst
                    for (var i = 0; i < dom.images.length; i++) {
                        var distance = Math.max(
                            Math.abs(region.left - dom.images[i].bounds[0]),
                            Math.abs(region.top - dom.images[i].bounds[1]),
                            Math.abs(region.right - dom.images[i].bounds[0] - dom.images[i].bounds[2]),
                            Math.abs(region.bottom - dom.images[i].bounds[1] - dom.images[i].bounds[3])
                        )

                        if (distance < minDistance) {
                            minDistance = distance
                            imgIndex = i
                        }
                    }

                    if (0 <= imgIndex < dom.images.length) {
                        output.push({
                            type: 'Image',
                            region,
                            source: dom.images[imgIndex].source
                        })
                        dom.images.splice(imgIndex, 1)
                    }
                    break
                default:
                    break
            }
        })
    }

    return output
}

// Recursively traverse all the keys in the Object.
function identical(m1, m2) {
    if (m1 instanceof Object) {
        if (!(m2 instanceof Object)) return false
        if (Object.keys(m1).length != Object.keys(m2).length) return false
        for (var key in m1) {
            if (!m2.hasOwnProperty(key)) return false
            if (!identical(m1[key], m2[key])) return false
        }
        return true
    } else if (m1 instanceof Array) {
        if (!(m2 instanceof Array)) return false
        if (m1.length !== m2.length) return false
        for (var i = 0; i < m1.length; i++) {
            if (!identical(m1[i], m2[i])) return false
        }
        return true
    } else {
        return m1 === m2
    }
}

// Determines whether m2 is fully covered by m1.
// 1. Filling Rect and Image can fully cover another method.
// 2. A method covers its identical methods.
function fullyCover(m1, m2) {
    if (identical(m1, m2)) return true
    if ((m1.type === 'Rect' && m1.style === 'Fill') || m1.type === 'Image') {
        var r1 = m1.region
        var r2 = m2.region
        if (r1.top <= r2.top && r1.bottom >= r2.bottom &&
            r1.left <= r2.left && r1.right >= r2.right)
            return true
    }
    return false
}

function getPageComposition(logs) {
    // Initial composition is empty and omitted.
    var output = []

    for (var i = 0; i < logs.length; i++) {
        var validMethods = []
        // Previous composistion is guaranteed to have no fully-cover cases.
        var prevCompo = i === 0 ? [] : output[i - 1]

        logs[i].forEach(m1 => {
            prevCompo.forEach(m2 => {
                // Method m2 is still not fully covered, so it stays.
                if (!fullyCover(m1, m2))
                    validMethods.push(m2)
            })

            // Now add method m1 into page composition, then check the next method.
            validMethods.push(m1)
            prevCompo = validMethods
            validMethods = []
        })

        output.push(prevCompo)
        prevCompo = undefined
    }

    return output
}

// Compress a method into a unique string.
function compressMethod(m) {
    var md5 = crypto.createHash('md5')
    return md5.update(JSON.stringify(m)).digest('hex')
}

// The nth log is compared to (n-1)th composition, as initial is omitted.
function computeRedundancy(logs, compos) {
    var result = []

    for (var i = 1; i < logs.length; i++) {
        var count = 0
        var paintSet = new Set()

        logs[i].forEach(m => {
            paintSet.add(compressMethod(m))
        })

        compos[i - 1].forEach(m => {
            if (paintSet.has(compressMethod(m)))
                count += 1
        })

        // Only record valid redundancy result.
        if (paintSet.size !== 0)
            result.push(count / paintSet.size)
    }

    return result
}

async function navigate(opt) {
    if (opt.task === 'B' && opt.index >= opt.urls.length) return

    var metadata = {
        url: opt.task === 'N' ? opt.url : opt.urls[opt.index],
        count: 0,
        start_time: 0,
        load_time: 0,
        times: {
            paint: [],
            network: []
        },
        viewport: {
            width: 1600,
            height: 900
        },
        styles: ["font-size", "font-family", "background-image"]
    }

    var requests = {}

    // We assume here folder does not end with '/'.
    if (!fs.existsSync(opt.folder)) {
        fs.mkdirSync(opt.folder)
    }
    else {
        if (opt.task === 'N') {
            var files = fs.readdirSync(opt.folder)
            files.forEach((f, i) => {
                var filename = `${opt.folder}/${f}`
                fs.unlinkSync(filename)
            })
        }
        else {
            if (!fs.existsSync(`${opt.folder}/${opt.index}/`)) {
                fs.mkdirSync(`${opt.folder}/${opt.index}/`)
            }
            else {
                var files = fs.readdirSync(`${opt.folder}/${opt.index}/`)
                files.forEach((f, i) => {
                    var filename = `${opt.folder}/${opt.index}/${f}`
                    fs.unlinkSync(filename)
                })
            }
        }
    }

    var url = opt.task === 'N' ? opt.url : opt.urls[opt.index]
    var folder = opt.task === 'N' ? opt.folder : `${opt.folder}/${opt.index}`

    var browser = await puppeteer.launch({
        headless: false,
        executablePath: "C:/Resources/chromium/chrome.exe"
    })
    var page = await browser.newPage()
    var client = await page.target().createCDPSession()

    var count = 0
    var lastEventTimestamp = 0
    var unfinishedSnapshot = 0
    var unfinishedPaintLog = 0

    await page.setViewport(metadata.viewport)
    await client.send("DOM.enable")
    await client.send("DOMSnapshot.enable")
    await client.send("LayerTree.enable")
    await client.send("Network.enable")

    if (opt.emu) {
        await client.send("Network.emulateNetworkConditions", {
            offline: false,
            latency: 300,
            downloadThroughput: opt.emu.down * 1024,
            uploadThroughput: opt.emu.up * 1024
        })
    }

    var monitor = new EventEmitter()

    monitor.on('dom', async args => {
        unfinishedSnapshot += 1
        try {
            var data = await args.client.send("DOMSnapshot.captureSnapshot", {
                computedStyles: metadata.styles,
                includePaintOrder: true,
                includeDOMRects: true
            })
            fs.writeFileSync(`${folder}/dom-${args.count}.json`, JSON.stringify(data))
            data = undefined

            console.log(`DOM\t ${args.count} captured.`)
        }
        catch (e) {

        }
        unfinishedSnapshot -= 1
    })

    monitor.on('paint', async args => {
        unfinishedPaintLog += 1
        try {
            var layer = await args.client.send("LayerTree.makeSnapshot", { layerId: args.params.layerId })
            var data = await args.client.send("LayerTree.snapshotCommandLog", { snapshotId: layer.snapshotId })
            fs.writeFileSync(`${folder}/paint-${args.count}.json`, JSON.stringify(data))
            layer = undefined
            data = undefined

            console.log(`Paint\t ${args.count} captured.`)
        }
        catch (e) {

        }
        unfinishedPaintLog -= 1
    })

    client.on("Network.requestWillBeSent", params => {
        requests[params.requestId] = params.request.url
    })

    client.on("Network.dataReceived", params => {
        if (requests[params.requestId]) {
            metadata.times.network.push({
                type: 'data',
                url: requests[params.requestId],
                time: Date.now(),
                length: params.dataLength
            })
        }
    })

    client.on("Network.responseReceived", params => {
        metadata.times.network.push({
            type: 'response',
            url: params.response.url,
            time: Date.now()
        })
    })

    client.on("LayerTree.layerPainted", params => {
        var now = Date.now()
        console.log('paint')
        // In simple mode, DOM snapshots and paint logs are not captured.
        if (opt.hasOwnProperty('mode') && opt.mode === 'simple') {
            metadata.times.paint.push(now)
        }
        // Otherwise, capturing is dispatched with frequency limit.
        else {
            if (now - lastEventTimestamp > 50) {
                count += 1
                lastEventTimestamp = now
                metadata.times.paint.push(now)

                if (monitor) {
                    monitor.emit('dom', { client, count })
                    monitor.emit('paint', { client, params, count })
                }
            }
        }
    })

    page.on('load', async () => {
        console.log('Page loaded.')
        metadata.load_time = Date.now()

        if (!opt.hasOwnProperty('timelimit')) {
            await delay(1000)
            stopNavigation()
        }
    })

    if (opt.hasOwnProperty('timelimit')) {
        // Stop capturing new data as time exceeds opt.timelimit
        setTimeout(function () {
            stopNavigation()
        }, opt.timelimit * 1000)
    }

    async function stopNavigation() {
        monitor = undefined

        // Actually stop navigation when all the data are captured.
        var interval = setInterval(async function () {
            if (unfinishedSnapshot <= 0 && unfinishedPaintLog <= 0) {
                clearInterval(interval)
                await client.detach()
                await page.close()
                await browser.close()

                metadata.count = count
                fs.writeFileSync(`${folder}/metadata.json`, JSON.stringify(metadata))
                console.log(`Navigation closed with ${count} paint events.\n`)

                if (opt.task === 'B') {
                    await delay(1000)

                    opt.index += 1
                    navigate(opt)
                }
            }
        }, 500)
    }

    console.log(`Navigation started for ${url}`)
    metadata.start_time = Date.now()
    await page.goto(url)
}

module.exports = {
    parseDomSnapshot,
    parsePaintLog,
    getPageComposition,
    computeRedundancy,
    navigate
}