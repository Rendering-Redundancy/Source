const fs = require('fs')
const merge = require('lodash.merge')

var data = JSON.parse(fs.readFileSync('163.com/trace.json'))

var workload = {
    ParseHTML: [],  // B->E, args.data{frame, url, startLine, endLine}
    ParseAuthorStyleSheet: [], // ts, dur, args.data.styleSheetUrl
    ScheduleStyleRecaculation: [], // I, ts, args.data.frame
    EvaluateScript: [], // ts, dur, args.data.{url, lineNumber, columnNumber, frame}
    Layout: [], // B->E, args.beginData, args.endData
    InvalidateLayout: [], // ts, args.data.frame, I
    Paint: [], // ts, dur, args.data.{frame, clip, nodeId, layerId}
    PaintImage: [], // ts, dur, args.data.{nodeId, url, x, y, width, height, srcWidth, srcHeight}

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

var task = {
    parseHTML: { start: [], end: [] },
    layout: { start: [], end: [] },
    updateLayer: { start: [], end: [] },
    updateLayoutTree: { start: [], end: [] },
    compositeLayers: { start: [], end: [] },
    rasterTask: { start: [], end: [] },
    imageDecodeTask: { start: [], end: [] }
}

data.traceEvents.forEach(e => {
    switch (e.name) {
        case "ParseHTML":
            if (e.ph === 'B') {
                d = e.args.beginData
                d.ts = e.ts
                task.parseHTML.start.push(d)
            } else {
                d = e.args.endData
                d.ts = e.ts
                task.parseHTML.end.push(d)
            }
            break
        case "ParseAuthorStyleSheet":
            workload.ParseAuthorStyleSheet.push({
                ts: e.ts,
                dur: e.dur,
                url: e.args.data.styleSheetUrl
            })
            break
        case "ScheduleStyleRecaculation":
            workload.ScheduleStyleRecaculation.push({
                ts: e.ts,
                frame: e.args.data.frame
            })
            break
        case "EvaluateScript":
            d = e.args.data
            d.ts = e.ts
            d.dur = e.dur
            workload.EvaluateScript.push(d)
            break
        case "Layout":
            if (e.ph === 'B') {
                d = e.args.beginData
                d.ts = e.ts
                task.layout.start.push(d)
            } else {
                d = e.args.endData
                d.ts = e.ts
                task.layout.end.push(d)
            }
            break
        case "InvalidateLayout":
            workload.InvalidateLayout.push({
                ts: e.ts,
                frame: e.args.data.frame
            })
            break
        case "Paint":
            d = e.args.data
            d.ts = e.ts
            d.dur = e.dur
            workload.Paint.push(d)
            break
        case "PaintImage":
            d = e.args.data
            d.ts = e.ts
            d.dur = e.dur
            workload.PaintImage.push(d)
            break

        case "ResourceSendRequest":
            d = e.args.data
            d.ts = e.ts
            workload.ResourceSendRequest.push(d)
            break
        case "ResourceReceivedData":
            d = e.args.data
            d.ts = e.ts
            workload.ResourceReceivedData.push(d)
            break
        case "ResourceReceiveResponse":
            d = e.args.data
            d.ts = e.ts
            workload.ResourceReceiveResponse.push(d)
            break
        case "ResourceFinish":
            d = e.args.data
            d.ts = e.ts
            workload.ResourceFinish.push(d)
            break
        case "ResourceChangePriority":
            workload.ResourceChangePriority.push({
                ts: e.ts,
                dur: e.dur,
                requestId: e.args.data.requestId
            })
            break

        case "UpdateLayer":
            if (e.ph === 'B') {
                d = e.args
                d.ts = e.ts
                task.updateLayer.start.push(d)
            } else {
                task.updateLayer.end.push({ ts: e.ts })
            }
            break
        case "UpdateLayerTree":
            d = e.args.data
            d.ts = e.ts
            d.dur = e.dur
            workload.UpdateLayerTree.push(d)
            break
        case "UpdateLayoutTree":
            if (e.ph === 'B') {
                d = e.args.beginData
                d.ts = e.ts
                task.updateLayoutTree.start.push(d)
            } else {
                d = e.args
                d.ts = e.ts
                task.updateLayoutTree.end.push(d)
            }
            break
        case "ActivateLayerTree":
            d = e.args
            d.ts = e.ts
            workload.ActivateLayerTree.push(d)
            break
        case "CompositeLayers":
            if (e.ph === 'B') {
                d = e.args
                d.ts = e.ts
                task.compositeLayers.start.push(d)
            } else {
                task.compositeLayers.end.push({ ts: e.ts })
            }
            break

        case "BeginFrame":
            d = e.args
            d.ts = e.ts
            workload.BeginFrame.push(d)
            break
        case "RasterTask":
            if (e.ph === 'B') {
                d = e.args.tileData
                d.ts = e.ts
                task.rasterTask.start.push(d)
            } else {
                task.rasterTask.end.push({ ts: e.ts })
            }
            break
        case "ImageDecodeTask":
            if (e.ph === 'B') {
                d = e.args
                d.ts = e.ts
                task.imageDecodeTask.start.push(d)
            } else {
                task.imageDecodeTask.end.push({ ts: e.ts })
            }
            break
        case "Decode Image":
            d = e.args
            d.ts = e.ts
            d.dur = e.dur
            workload.DecodeImage.push(d)
            break
        case "Decode LazyPixelRef":
            d = e.args
            d.ts = e.ts
            d.dur = e.dur
            workload.DecodeLazyPixelRef.push(d)
            break
        case "Draw LazyPixelRef":
            d = e.args
            d.ts = e.ts
            workload.DrawLazyPixelRef.push(d)
            break
        case "DrawFrame":
            d = e.args
            d.ts = e.ts
            workload.DrawFrame.push(d)
            break
        case "FrameCommittedInBrowser":
            d = e.args.data
            d.ts = e.ts
            workload.FrameCommittedInBrowser.push(d)
            break
        case "FrameStartedLoading":
            d = e.args
            d.ts = e.ts
            workload.FrameStartedLoading.push(d)
            break
    }
})

var l = task.parseHTML.start.length
for (var i = 0; i < l; i++) {
    ts = task.parseHTML.start[i].ts
    dur = task.parseHTML.end[i].ts - task.parseHTML.start[i].ts
    d = merge(task.parseHTML.start[i], task.parseHTML.end[i])
    d.ts = ts
    d.dur = dur
    workload.ParseHTML.push(d)
}

l = task.layout.start.length
for (var i = 0; i < l; i++) {
    ts = task.layout.start[i].ts
    dur = task.layout.end[i].ts - task.layout.start[i].ts
    d = merge(task.layout.start[i], task.layout.end[i])
    d.ts = ts
    d.dur = dur
    workload.Layout.push(d)
}

l = task.updateLayer.start.length
for (var i = 0; i < l; i++) {
    d = task.updateLayer.start[i]
    d.dur = task.updateLayer.end[i].ts - d.ts
    workload.UpdateLayer.push(d)
}

l = task.updateLayoutTree.start.length
for (var i = 0; i < l; i++) {
    ts = task.updateLayoutTree.start[i].ts
    dur = task.updateLayoutTree.end[i].ts - task.updateLayoutTree.start[i].ts
    d = merge(task.updateLayoutTree.start[i], task.updateLayoutTree.end[i])
    d.ts = ts
    d.dur = dur
    workload.UpdateLayoutTree.push(d)
}

l = task.compositeLayers.start.length
for (var i = 0; i < l; i++) {
    d = task.compositeLayers.start[i]
    d.dur = task.compositeLayers.end[i].ts - d.ts
    workload.CompositeLayers.push(d)
}

l = task.rasterTask.start.length
for (var i = 0; i < l; i++) {
    d = task.rasterTask.start[i]
    d.dur = task.rasterTask.end[i].ts - d.ts
    workload.RasterTask.push(d)
}

l = task.imageDecodeTask.start.length
for (var i = 0; i < l; i++) {
    d = task.imageDecodeTask.start[i]
    d.dur = task.imageDecodeTask.end[i].ts - d.ts
    workload.ImageDecodeTask.push(d)
}

fs.writeFileSync('workload.json', JSON.stringify(workload))