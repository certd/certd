import fs from 'fs'



export function getVersionContent() {
    // CHANGELOG.md
    const changelog = fs.readFileSync('./CHANGELOG.md', 'utf8')
    // 解析CHANGELOG.md
    let lines = changelog.split('\n')
    const versionLineIndex = lines.findIndex(line => {
        return line.startsWith('## [') || line.startsWith('# [')
    })
    const versionLine = lines[versionLineIndex]
    //  ## [1.37.16](https://github.com/certd/certd/compare/v1.37.15...v1.37.16) (2025-12-15)
    const versionTitle = versionLine.match(/\[(.*?)\]/)[1]

    const contentStart = versionLineIndex + 1
    lines = lines.slice(contentStart)
    const contentEnd = lines.findIndex(line => {
        return line.startsWith('## ')
    })
    const content = lines.slice(0, contentEnd).join('\n')
    console.log("-------title------/n")
    console.log(versionTitle)
    console.log("-------content------/n")
    console.log(content)

    return {
        versionTitle,
        content
    }
}