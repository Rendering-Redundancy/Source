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
    emu: {
        down: 100,
        up: 300
    },
    // timelimit: 20,          // the time limit (in second) for navigation.
    // mode: 'simple'          // simple mode: do not capture DOM snapshot or paint log.
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
    }
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