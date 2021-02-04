import os from 'os'
import fs from 'fs-extra'
import pathUtil from '../utils/util.path.js'
import cryptoRandomString from 'crypto-random-string'
import zipUtil from '../utils/util.zip.js'
import path from 'path'

export default {
  async exportsToZip (options, dirName) {
    const tempDir = os.tmpdir()
    const targetDir = path.join(tempDir, 'certd-server', cryptoRandomString(10))
    const projectName = dirName
    const targetProjectDir = path.join(targetDir, projectName)
    const templateDir = pathUtil.join('templates/' + projectName)

    console.log('targetDir', targetDir)
    console.log('projectName', projectName)
    console.log('tempalteDir', templateDir)
    console.log('targetProjectDir', targetProjectDir)
    fs.copySync(templateDir, targetProjectDir)

    // const packageFilePath = path.join(targetProjectDir, 'package.json')
    const optionsFilePath = path.join(targetProjectDir, 'options.json')

    fs.writeJsonSync(optionsFilePath, options)

    const zipName = dirName + '.zip'
    const outputFilePath = path.join(targetDir, zipName)

    console.log('outputFilePath', outputFilePath)
    await zipUtil.compress({ dir: targetProjectDir, output: outputFilePath })
    return {
      dir: targetDir,
      fileName: zipName,
      zipPath: outputFilePath
    }
  }

}
