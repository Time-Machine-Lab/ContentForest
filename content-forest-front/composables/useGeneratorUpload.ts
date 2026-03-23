export interface UploadGeneratorDto {
  name: string
  description: string
  platform: string
  domain: string
  contentTypes: string[]
  outputCapabilities: string[]
  tags: string[]
  file: File
}

export function useGeneratorUpload() {
  const uploading = ref(false)

  async function upload(dto: UploadGeneratorDto): Promise<{ id: string; skillPath: string }> {
    uploading.value = true
    try {
      const form = new FormData()
      form.append('name', dto.name)
      form.append('description', dto.description)
      form.append('platform', dto.platform)
      form.append('domain', dto.domain)
      form.append('contentTypes', JSON.stringify(dto.contentTypes))
      form.append('outputCapabilities', JSON.stringify(dto.outputCapabilities))
      form.append('tags', JSON.stringify(dto.tags))
      form.append('file', dto.file)

      const res = await $fetch<{ code: number; data: { id: string; skillPath: string } }>(
        '/api/generators/upload',
        {
          method: 'POST',
          headers: { 'x-user-id': 'local_admin' },
          body: form,
        }
      )
      return res.data
    } finally {
      uploading.value = false
    }
  }

  return { uploading, upload }
}
