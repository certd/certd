export default {
  join (...dirs) {
    const url = new URL('../' + dirs.join('/'), import.meta.url)
    return url.href.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '')
  }
}
