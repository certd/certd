import { request } from './service'

export default {
  exportsToZip (options) {
    return request({
      url: '/exports/toZip',
      data: { options },
      method: 'post',
      responseType: 'blob' // 重点在于配置responseType: 'blob'
    }).then(res => {
      console.log('res', res)
      const filename = decodeURI(res.headers['content-disposition'].replace('attachment;filename=', '')) // 由后端设置下载文件名
      const blob = new Blob([res.data], { type: 'application/zip' })
      const a = document.createElement('a')
      const url = window.URL.createObjectURL(blob)
      a.href = url
      a.download = filename
      const body = document.getElementsByTagName('body')[0]
      body.appendChild(a)
      a.click()
      body.removeChild(a)
      window.URL.revokeObjectURL(url)
    })
  }
}
