const fs = require('fs')

function getDurationalTasks(filename) {
    var trace_data = JSON.parse(fs.readFileSync(filename))
    var durational_tasks = new Set()

    trace_data.traceEvents.forEach(d => {
        if (d.ph === 'B' || d.ph === 'X')
            durational_tasks.add(d.name)
    })

    fs.writeFileSync('tasks.json', JSON.stringify({ tasks: Array.from(durational_tasks).sort() }))
}

function getTaskGraph(filename) {
    var workloads = JSON.parse(fs.readFileSync(filename)).workloads
    var dependency = []
    var idx = new Set()

    var l = workloads.length
    for (var i = 0; i < l; i++) {
        workloads[i].idx = i
        for (var j = i + 1; j < l; j++) {
            if (workloads[i].tid === workloads[j].tid &&
                workloads[i].ts + workloads[i].dur >= workloads[j].ts + workloads[j].dur) {
                dependency.push([i, j])
                idx.add(i)
                idx.add(j)
            }
        }
    }

    var standalone = workloads.filter(d => { return !idx.has(d.idx) })
    var related = workloads.filter(d => { return idx.has(d.idx) })

    related.forEach(w => {
        dependency.forEach(pair => {
            if (w.idx === pair[0]) {
                if (w.hasOwnProperty('includes')) {
                    w.includes.push(workloads[pair[1]])
                } else {
                    w.includes = [workloads[pair[1]]]
                }
            }
        })
    })

    // fs.writeFileSync('dependency.json', JSON.stringify({ dependency: Array.from(dependency) }))
}

getTaskGraph('workloads.json')