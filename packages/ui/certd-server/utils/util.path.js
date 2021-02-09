import os from 'os'
export default {
  join (...dirs) {
    const url = new URL('../' + dirs.join('/'), import.meta.url)
    let path = url.pathname
    if (os.type() === 'Windows_NT') {
      path = path.substring(1)
    }
    return path
  }
}
