import fs from 'fs'
const pkg = JSON.parse(fs.readFileSync('./packages/ui/certd-server/package.json'))
console.log(pkg.version)
