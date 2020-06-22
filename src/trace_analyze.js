const fs = require('fs')
const { privateDecrypt } = require('crypto')
const { decode } = require('punycode')

data = JSON.parse(fs.readFileSync('163.com/trace.json'))

// ts and tts are both at microsecond granulatity.

function getRasterTime() {
    id_total = 0
    id_count = 0
    raster_total = 0

    raster_begin = []
    raster_end = []

    data.traceEvents.forEach(entry => {
        if (entry.hasOwnProperty('name')) {
            if (entry.name === 'Decode Image') {
                id_total += entry.dur
                id_count += 1
            } else if (entry.name === 'RasterTask') {
                if (entry.ph === 'B')
                    raster_begin.push(entry.ts)
                else {
                    raster_end.push(entry.ts)
                }
            }
        }
    })

    var len = Math.min(raster_begin.length, raster_end.length)

    for (var i = 0; i < len; i++) {
        raster_total += raster_end[i] - raster_begin[i]
    }

    // console.log(id_count, len)
    // console.log(id_total / 1000, 'ms')
    // console.log(raster_total / 1000, 'ms')
    return [id_count, len, id_total / 1000, raster_total / 1000];
}

function getAllMethods() {
    var res = new Set()
    data.traceEvents.forEach(d => {
        if (d.hasOwnProperty('name'))
            res.add(d.name)
    })

    fs.writeFileSync('methods.json', JSON.stringify({ methods: Array.from(res).sort() }))
}

function getThreadNames() {
    var res = {}
    data.traceEvents.forEach(d => {
        if (d.hasOwnProperty('name') && d.name === 'thread_name') {
            res[d.args.name] = d.tid
        }
    })

    fs.writeFileSync('thread_names.json', JSON.stringify(res))
}

function getRasterThreadId() {
    var res = new Set()
    data.traceEvents.forEach(d => {
        if (d.hasOwnProperty('name') && (d.name === 'RasterTask' || d.name === 'TaskGraphRunner::RunTask'))
            res.add(d.tid)
    })
    res = Array.from(res).sort((a, b) => { return a - b })
    console.log(res)
}

// DrawFrame is not a frame update (as in FPS)?
function getDrawFrameTimes() {
    var frame_start = []
    var draw_frame = []
    data.traceEvents.forEach(d => {
        if (d.name === 'BeginFrame')
            frame_start.push(d.ts)
        else if (d.name === 'DrawFrame')
            draw_frame.push(d.ts)
    })
    frame_start.sort()
    draw_frame.sort()
    var period = []
    // console.log(frame_start.length, draw_frame.length)
    for (var i = 1; i < draw_frame.length; i++) {
        period.push(draw_frame[i] - draw_frame[i - 1])
    }
    console.log(period)
}

function getTaskDurationFromWorkload(filename) {
    var workload = JSON.parse(fs.readFileSync(filename))
    var decode_image_dur = 0, layout_dur = 0

    workload.Layout.forEach(d => {
        layout_dur += d.dur / 1000
    })

    workload.DecodeImage.forEach(d => {
        decode_image_dur += d.dur / 1000
    })

    console.log(layout_dur, decode_image_dur)
}

getTaskDurationFromWorkload('workload.json')