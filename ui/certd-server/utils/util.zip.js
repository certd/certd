import compressing from 'compressing'
export default {
  compress ({
    dir, output
  }) {
    return compressing.zip.compressDir(dir, output)
  }
}
