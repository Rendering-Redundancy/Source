const fs = require('fs')
const {
    RSA_X931_PADDING
} = require('constants')

class CrTracce {
    constructor() {
        this.processes = []
        this.id_to_index = {} // pid -> index
    }

    getProcessById(id) {
        if (this.id_to_index.hasOwnProperty(id))
            return this.processes[this.id_to_index[id]]
        return undefined
    }

    getAllProcesses() {
        return this.processes
    }

    addProcess(p) {
        this.id_to_index[p.id] = this.processes.length
        this.processes.push(p)
    }
}

class CrProcess {
    constructor(id) {
        this.id = id
        this.name = ""
        this.threads = []
        this.id_to_index = {} // tid -> index
    }

    setName(n) {
        this.name = n
    }

    getThreadById(id) {
        if (this.id_to_index.hasOwnProperty(id))
            return this.threads[this.id_to_index[id]]
        return undefined
    }

    getAllThreads() {
        return this.threads
    }

    addThread(t) {
        this.id_to_index[t.id] = this.threads.length
        this.threads.push(t)
    }
}

class CrThread {
    constructor(id) {
        this.id = id
        this.name = ""
        this.events = []
    }

    setName(n) {
        this.name = n
    }

    addEvent(e) {
        this.events.push(e)
    }

    buildEventTree() {
        var dependency = {}
        var child_indexes = new Set()

        for (var i = 0; i < this.events.length; i++) {
            var e1 = this.events[i]
            for (var j = i + 1; j < this.events.length; j++) {
                var e2 = this.events[j]
                if (e1.includes(e2)) {
                    if (!dependency.hasOwnProperty(i)) dependency[i] = []
                    dependency[i].push(j)
                    child_indexes.add(j)
                } else if (e2.includes(e1)) {
                    if (!dependency.hasOwnProperty(j)) dependency[j] = []
                    dependency[j].push(i)
                    child_indexes.add(i)
                }
            }
        }

        // Remove multi-hop path.
        for (var k in dependency) {
            var keys = [...dependency[k]]
            keys.forEach(k_ => {
                if (dependency.hasOwnProperty(k_)) {
                    var keys_ = dependency[k_]
                    keys_.forEach(k__ => {
                        var idx = dependency[k].indexOf(k__)
                        if (idx >= 0) dependency[k].splice(idx, 1)
                    })
                }
            })
        }

        // Build trees based on dependency.
        for (var k in dependency) {
            var idx = parseInt(k)
            var root = this.events[idx]
            dependency[k].forEach(k_ => {
                root.children.push(this.events[k_])
            })
        }

        // Keep only root nodes.
        this.events.filter((_, i) => {
            return !child_indexes.has(i)
        })

        this.events.forEach(e => {
            e.updateRenderRelated()
        })
    }

    filterByName(n) {

    }

    getFirstRenderEventAfter(t) {

    }
}

class CrEvent {
    constructor(cat, name, ts, dur, data) {
        this.cat = cat
        this.name = name
        this.ts = ts
        this.dur = dur
        this.data = data
        this.render_related = this.isRenderRelated()

        this.children = []
    }

    includes(e) {
        return this.ts <= e.ts && this.ts + this.dur >= e.ts + e.dur
    }

    isRenderRelated() {
        return CrEvent.RenderEvents.indexOf(this.name) !== -1
    }

    updateRenderRelated() {
        if (this.children.length !== 0) {
            for (var i = 0; i < this.children.length; i++) {
                if (this.children[i].updateRenderRelated()) {
                    this.render_related = true
                }
            }
        }
        return this.render_related
    }
}

CrEvent.RenderEvents = [
    'ParseHTML',
    'ParseAuthorStyleSheet',
    'Layout',
    'UpdateLayer',
    'UpdateLayerTree',
    'UpdateLayoutTree',
    'Paint',
    'PaintImage',
    'CompositeLayers'
]

function modelTesting(traceFile) {
    var ct = new CrTracce()
    var rawData = JSON.parse(fs.readFileSync(traceFile))

    rawData.traceEvents.forEach(e => {
        var proc = ct.getProcessById(e.pid)
        if (!proc) {
            proc = new CrProcess(e.pid)
            ct.addProcess(proc)
        }

        var thread = proc.getThreadById(e.tid)
        if (!thread) {
            thread = new CrThread(e.tid)
            proc.addThread(thread)
        }

        switch (e.name) {
            case 'thread_name':
                thread.setName(e.args.name)
                break
            case 'process_name':
                proc.setName(e.args.name)
                break
            default:
                if (e.cat !== '__metadata') {
                    var event = new CrEvent(e.cat, e.name, e.ts, e.dur || 0, e.args || e.args.data)
                    thread.addEvent(event)
                }
                break
        }
    })

    ct.getAllProcesses().forEach(p => {
        p.getAllThreads().forEach(t => {
            t.buildEventTree()
        })
    })
}

modelTesting('trace.json')