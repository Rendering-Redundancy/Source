const fs = require('fs')
const merge = require('lodash.merge')

// ts and dur are in microsecond granularity. 
const TASK_FORMAT = {
    ParseHTML: [],  // B->E, args.data{frame, url, startLine, endLine}
    ParseAuthorStyleSheet: [], // ts, dur, args.data.styleSheetUrl
    ScheduleStyleRecaculation: [], // I, ts, args.data.frame
    EvaluateScript: [], // ts, dur, args.data.{url, lineNumber, columnNumber, frame}
    Layout: [], // B->E, args.beginData, args.endData
    InvalidateLayout: [], // I, ts, args.data.frame
    Paint: [], // ts, dur, args.datat.{frame, clip, nodeId, layerId}
    PaintImage: [], // ts, dur, args.data.{nodeId, url, x, y, width, heigh, srcWidth, srcHeight}

    ResourceSendRequest: [], // I, ts, args.data.{requestId, frame, url, ... }
    ResourceReceivedData: [], // I, ts, args.data.{requestId, frame, encodedDataLength}
    ResourceReceiveResponse: [], // I, ts, args.data.{requestId, frame, statusCode, ... }
    ResourceFinish: [], // I, ts, args.data.{requestId, didFail, encodedDataLength, ... }
    ResourceChangePriority: [], // ts, dur, args.data.requestId

    UpdateLayer: [], // B->E, args.{layerId, layerTreeId}
    UpdateLayerTree: [], // ts, dur, args.data.frame
    UpdateLayoutTree: [], // B->E, args.{beginData.{frame, stackTrace}, elementCount}
    ActivateLayerTree: [], // I, ts, args.{layerTreeId, frameId}
    CompositeLayers: [], // B->E, args.layerTreeId

    BeginFrame: [], // I, ts, args.layerTreeId
    RasterTask: [], // B->E, args.tileData.{tileId.id_ref, tileResolution, sourceFrameNumber, layerId}
    ImageDecodeTask: [], // B->E, args.pixelRefId
    DecodeImage: [], // ts, dur, args.imageType
    DecodeLazyPixelRef: [], // ts, dur, args.LazyPixelRef
    DrawLazyPixelRef: [], // I, ts, args.lazypixelref
    DrawFrame: [], // I, ts, args.layerTreeId
    FrameCommittedInBrowser: [], // I, ts, args.data.{frame, url, ... }
    FrameStartedLoading: [], // I, ts, args.frame
}

var data = JSON.parse(fs.readFileSync('trace.json'))

var workloads = [], events = []

var task = {
    parseHTML: { start: [], end: [] },
    layout: { start: [], end: [] },
    updateLayer: { start: [], end: [] },
    updateLayoutTree: { start: [], end: [] },
    compositeLayers: { start: [], end: [] },
    rasterTask: { start: [], end: [] },
    imageDecodeTask: { start: [], end: [] }
}

var nav_times = []

data.traceEvents.forEach(e => {
    switch (e.name) {
        case "navigationStart":
            url = e.args.data.documentLoaderURL
            if (url) nav_times.push({ url, ts: e.ts, tid: e.tid })
            break
        case "ParseHTML":
            if (e.ph === 'B') {
                d = e.args.beginData
                d.ts = e.ts
                d.tid = e.tid
                task.parseHTML.start.push(d)
            } else {
                d = e.args.endData
                d.ts = e.ts
                task.parseHTML.end.push(d)
            }
            break
        case "ParseAuthorStyleSheet":
            workloads.push({
                type: "ParseAuthorStyleSheet",
                tid: e.tid,
                ts: e.ts,
                dur: e.dur,
                url: e.args.data.styleSheetUrl
            })
            break
        case "EvaluateScript":
            d = e.args.data
            d.type = "EvaluateScript"
            d.tid = e.tid
            d.ts = e.ts
            d.dur = e.dur
            workloads.push(d)
            break
        case "FunctionCall":
            d = e.args.data
            d.type = "FunctionCall"
            d.tid = e.tid
            d.ts = e.ts
            d.dur = e.dur
            workloads.push(d)
            break
        case "HitTest":
            d = e.args.endData
            d.type = "HitTest"
            d.tid = e.tid
            d.ts = e.ts
            d.dur = e.dur
            workloads.push(d)
            break
        case "Layout":
            if (e.ph === 'B') {
                d = e.args.beginData
                d.tid = e.tid
                d.ts = e.ts
                task.layout.start.push(d)
            } else {
                d = e.args.endData
                d.ts = e.ts
                task.layout.end.push(d)
            }
            break
        case "Paint":
            d = e.args.data
            d.type = "Paint"
            d.tid = e.tid
            d.ts = e.ts
            d.dur = e.dur
            workloads.push(d)
            break
        case "PaintImage":
            d = e.args.data
            d.type = "PaintImage"
            d.tid = e.tid
            d.ts = e.ts
            d.dur = e.dur
            workloads.push(d)
            break

        case "ResourceSendRequest":
            d = e.args.data
            d.type = "ResourceSendRequest"
            d.tid = e.tid
            d.ts = e.ts
            events.push(d)
            break
        case "ResourceReceivedData":
            d = e.args.data
            d.type = "ResourceReceivedData"
            d.tid = e.tid
            d.ts = e.ts
            events.push(d)
            break
        case "ResourceReceiveResponse":
            d = e.args.data
            d.type = "ResourceReceiveResponse"
            d.tid = e.tid
            d.ts = e.ts
            events.push(d)
            break

        case "UpdateLayer":
            if (e.ph === 'B') {
                d = e.args
                d.tid = e.tid
                d.ts = e.ts
                task.updateLayer.start.push(d)
            } else {
                task.updateLayer.end.push({ ts: e.ts })
            }
            break
        case "UpdateLayerTree":
            d = e.args.data
            d.type = "UpdateLayerTree"
            d.tid = e.tid
            d.ts = e.ts
            d.dur = e.dur
            workloads.push(d)
            break
        case "UpdateLayoutTree":
            if (e.ph === 'B') {
                d = e.args.beginData
                d.tid = e.tid
                d.ts = e.ts
                task.updateLayoutTree.start.push(d)
            } else {
                d = e.args
                d.ts = e.ts
                task.updateLayoutTree.end.push(d)
            }
            break
        case "CompositeLayers":
            if (e.ph === 'B') {
                d = e.args
                d.tid = e.tid
                d.ts = e.ts
                task.compositeLayers.start.push(d)
            } else {
                task.compositeLayers.end.push({ ts: e.ts })
            }
            break

        case "BeginFrame":
            d = e.args
            d.type = "BeginFrame"
            d.tid = e.tid
            d.ts = e.ts
            events.push(d)
            break
        case "RasterTask":
            if (e.ph === 'B') {
                d = e.args.tileData
                d.tid = e.tid
                d.ts = e.ts
                task.rasterTask.start.push(d)
            } else {
                task.rasterTask.end.push({ ts: e.ts })
            }
            break
        case "ImageDecodeTask":
            if (e.ph === 'B') {
                d = e.args
                d.tid = e.tid
                d.ts = e.ts
                task.imageDecodeTask.start.push(d)
            } else {
                task.imageDecodeTask.end.push({ ts: e.ts })
            }
            break
        case "Decode Image":
            d = e.args
            d.type = "DecodeImage"
            d.tid = e.tid
            d.ts = e.ts
            d.dur = e.dur
            workloads.push(d)
            break
        case "Decode LazyPixelRef":
            d = e.args
            d.type = "DecodeLazyPixelRef"
            d.tid = e.tid
            d.ts = e.ts
            d.dur = e.dur
            workloads.push(d)
            break
        case "DrawFrame":
            d = e.args
            d.type = "DrawFrame"
            d.tid = e.tid
            d.ts = e.ts
            events.push(d)
            break
    }
})

var l = task.parseHTML.start.length
for (var i = 0; i < l; i++) {
    ts = task.parseHTML.start[i].ts
    dur = task.parseHTML.end[i].ts - task.parseHTML.start[i].ts
    d = merge(task.parseHTML.start[i], task.parseHTML.end[i])
    d.type = "ParseHTML"
    d.tid = task.parseHTML.start[i].tid
    d.ts = ts
    d.dur = dur
    workloads.push(d)
}

l = task.layout.start.length
for (var i = 0; i < l; i++) {
    ts = task.layout.start[i].ts
    dur = task.layout.end[i].ts - task.layout.start[i].ts
    d = merge(task.layout.start[i], task.layout.end[i])
    d.type = "Layout"
    d.tid = task.layout.start[i].tid
    d.ts = ts
    d.dur = dur
    workloads.push(d)
}

l = task.updateLayer.start.length
for (var i = 0; i < l; i++) {
    d = task.updateLayer.start[i]
    d.type = "UpdateLayer"
    d.tid = task.updateLayer.start[i].tid
    d.dur = task.updateLayer.end[i].ts - d.ts
    workloads.push(d)
}

l = task.updateLayoutTree.start.length
for (var i = 0; i < l; i++) {
    ts = task.updateLayoutTree.start[i].ts
    dur = task.updateLayoutTree.end[i].ts - task.updateLayoutTree.start[i].ts
    d = merge(task.updateLayoutTree.start[i], task.updateLayoutTree.end[i])
    d.type = "UpdateLayoutTree"
    d.tid = task.updateLayoutTree.start[i].tid
    d.ts = ts
    d.dur = dur
    workloads.push(d)
}

l = task.compositeLayers.start.length
for (var i = 0; i < l; i++) {
    d = task.compositeLayers.start[i]
    d.type = "CompositeLayers"
    d.tid = task.compositeLayers.start[i].tid
    d.dur = task.compositeLayers.end[i].ts - d.ts
    workloads.push(d)
}

l = task.rasterTask.start.length
for (var i = 0; i < l; i++) {
    d = task.rasterTask.start[i]
    d.type = "RasterTask"
    d.tid = task.rasterTask.start[i].tid
    d.dur = task.rasterTask.end[i].ts - d.ts
    workloads.push(d)
}

l = task.imageDecodeTask.start.length
for (var i = 0; i < l; i++) {
    d = task.imageDecodeTask.start[i]
    d.type = "ImageDecodeTask"
    d.tid = task.imageDecodeTask.start[i].tid
    d.dur = task.imageDecodeTask.end[i].ts - d.ts
    workloads.push(d)
}

nav_times.sort((a, b) => { return a.ts - b.ts })
var navigation_start = nav_times[0].ts

workloads.forEach(e => { e.ts -= navigation_start })
workloads.sort((a, b) => { return a.ts - b.ts })
events.forEach(e => { e.ts -= navigation_start })

fs.writeFileSync('workloads.json', JSON.stringify({ workloads, events }))