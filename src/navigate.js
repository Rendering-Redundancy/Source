const delay = require('delay')
const fs = require('fs')
const puppeteer = require('puppeteer')

async function navigate(url) {
    var paint_events = []
    var layer_change_events = []

    var browser = await puppeteer.launch()
    var page = await browser.newPage()
    var client = await page.target().createCDPSession()

    await client.send("LayerTree.enable")

    var count = 0

    client.on('LayerTree.layerPainted', args => {
        count += 1
        console.log(count)

        args.ts = Date.now()
        paint_events.push(args)
    })

    client.on('LayerTree.layerTreeDidChange', args => {
        args.ts = Date.now()
        layer_change_events.push(args)
    })

    page.on('load', async () => {
        await delay(1000)

        await page.tracing.stop()
        await client.detach()
        await page.close()
        await browser.close()

        fs.writeFileSync('layer_paint.json',
            JSON.stringify({ paint_events, layer_change_events, navigation_start }))
    })

    // setTimeout(async function () {
    //     await page.tracing.stop()
    //     await client.detach()
    //     await page.close()
    //     await browser.close()

    //     fs.writeFileSync('layer_paint.json',
    //         JSON.stringify({ paint_events, layer_change_events, navigation_start }))
    // }, 20000)

    var navigation_start = Date.now()

    await page.tracing.start({ path: 'trace.json' })
    await page.goto(url)
}

navigate('https://www.baidu.com')
