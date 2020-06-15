const fs = require('fs')

data = JSON.parse(fs.readFileSync('163.com/trace.json'))

id_total = 0
id_count = 0
raster_total = 0
// raster_threads = new Set()
// methods = new Set()
// categories = new Set()

raster_begin = []
raster_end = []

data.traceEvents.forEach(entry => {
    if (entry.hasOwnProperty('name')) {
        if (entry.name === 'Decode Image') {
            id_total += entry.dur
            id_count += 1
            // raster_threads.add(entry.tid)
        }
        if (entry.name === 'RasterTask') {
            if (entry.ph === 'B')
                raster_begin.push(entry.ts)
            else {
                raster_end.push(entry.ts)
            }
        }
    }
})

var len = Math.min(raster_begin.length, raster_end.length)

for (var i = 0;i < len;i ++) {
    raster_total += raster_end[i] - raster_begin[i]
}

// trace.traceEvents.forEach(entry => {
//     if (entry.hasOwnProperty('tid') && raster_threads.has(entry.tid)) {
//         if (entry.hasOwnProperty('name')) {
//             methods.add(entry.name)
//         }
//         if (entry.hasOwnProperty('cat')) {
//             categories.add(entry.cat)
//         }
//     }
// })

console.log(id_count, len)
console.log(id_total / 1000, 'ms')
console.log(raster_total / 1000, 'ms')
// console.log(raster_threads)
// console.log(methods)
// console.log(categories)