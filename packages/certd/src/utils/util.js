import path from 'path'

function getUserBasePath () {
  const userHome = process.env.USERPROFILE
  return path.resolve(userHome, './.certd')
}
export default {
  getUserBasePath
}
