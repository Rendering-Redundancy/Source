const fs = require('fs')
const util = require('./rr_util')

// Compute the redundancy using recorded data.
var optionC = {
    task: 'C',
    folder: 'tmp'
}

// Navigate with a single URL.
var optionN = {
    task: 'N',
    folder: 'tmp',
    url: 'http://localhost:8000',

    // Specify the emulated network condition.
    emu: {
        delay: 100,         // Delay in milliseconds.
        down: 300,          // Download bandwidth in KB.
        up: 300             // Upload bandwidth in KB.
    },

    // Time limit (in seconds) for navigation.
    timelimit: 10,
 
    // Mode simple: only record timeticks of paint/network events.
    // Mode tracing: only record tracing result (in folder/trace.json).
    // Mode default: record tracing result, DOM snapshots and paint logs.
    mode: 'tracing'
}

// Batch navigate with a list of URLs.
var optionB = {
    task: 'B',
    folder: 'tmp',
    urls: [
        'https://www.baidu.com',
        'https://www.qq.com',
        'https://www.163.com',
        'https://www.taobao.com',
        'https://www.jd.com',
        'https://www.hao123.com',
        'https://weibo.com/'
    ],
    index: 0,
    emu: {
        down: 300,
        up: 300
    },
    mode: 'default'
}

var options = optionN

process.on('unhandledRejection', () => { })
process.on('uncaughtException', () => { })
process.on('exit', () => { })

if (options.task === 'C') {
    var metadata = JSON.parse(fs.readFileSync(`${options.folder}/metadata.json`))
    var paints = []

    console.log('Extracting paint content...')
    var start = Date.now()
    for (var i = 0; i < metadata.count; i++) {
        if (fs.existsSync(`${options.folder}/dom-${i + 1}.json`) &&
            fs.existsSync(`${options.folder}/paint-${i + 1}.json`)) {
            var dom = util.parseDomSnapshot(JSON.parse(fs.readFileSync(`${options.folder}/dom-${i + 1}.json`)))
            var paint = util.parsePaintLog(dom, JSON.parse(fs.readFileSync(`${options.folder}/paint-${i + 1}.json`)))
            paints.push(paint)
            dom = undefined
            paint = undefined
        } else {
            paints.push([]);
        }
    }
    var end = Date.now()
    console.log(`Finished in ${end - start} ms.`)

    console.log('Computing page composition...')
    start = Date.now()
    var compos = util.getPageComposition(paints)
    end = Date.now()
    console.log(`Finished in ${end - start} ms.`)

    console.log('Computing paint redundancy...')
    start = Date.now()
    var result = util.computeRedundancy(paints, compos)
    end = Date.now()
    console.log(`Finished in ${end - start} ms.`)

    fs.writeFileSync(`${options.folder}/redundancy.json`, JSON.stringify({ result }))
    console.log(`Result saved in ${options.folder}/redundancy.json.`)
}
else {
    util.navigate(options)
}