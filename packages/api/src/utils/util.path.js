import path from 'path'

function getUserBasePath () {
  const userHome = process.env.USERPROFILE || process.env.HOME
  return path.resolve(userHome, './.certd')
}
export default {
  getUserBasePath
}
