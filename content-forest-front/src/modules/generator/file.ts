export function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = String(reader.result || '')
      const [, base64 = ''] = result.split(',')
      if (!base64) {
        reject(new Error('文件读取失败，请重新选择 zip 文件'))
        return
      }
      resolve(base64)
    }

    reader.onerror = () => reject(new Error('文件读取失败，请重新选择 zip 文件'))
    reader.readAsDataURL(file)
  })
}
