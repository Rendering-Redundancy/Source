const fs = require('fs')
const util = require('./rr_util')

var options = {
    task: 'N',      // N (navigation), C (computation), B (batch).
    folder: 'tmp',  // Where output files are (to be) stored.

    // Following attributes are applied when task === 'N'.
    url: 'https://www.qq.com',
    emu: {
        down: 300,        // Download bandwidth in KB.
        up: 300         // Upload bandwidth in KB.
    }
}

process.on('unhandledRejection', () => { })
process.on('uncaughtException', () => { })
process.on('exit', () => { })

if (options.task === 'N') {
    if (options.hasOwnProperty('emu')) {
        util.navigate(options.url, options.folder, options.emu)
    }
    else {
        util.navigate(options.url, options.folder)
    }
}
else if (options.task === 'B') {
    
}
else {
    var metadata = JSON.parse(fs.readFileSync(`${options.folder}/metadata.json`))
    var paints = []
    var compos = []

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
    compos = util.getPageComposition(paints)
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
