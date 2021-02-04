export default {
  join (...dirs) {
    const url = new URL('../' + dirs.join('/'), import.meta.url)
    console.log('url', url)
    return url.pathname
  }
}
