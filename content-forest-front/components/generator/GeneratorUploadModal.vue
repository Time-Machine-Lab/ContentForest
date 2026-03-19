<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="handleClose"
      >
        <div class="w-full max-w-2xl bg-void-2 border border-gene-blue/20 flex flex-col max-h-[90vh] overflow-hidden relative">
          <div class="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-gene-blue/5 to-transparent pointer-events-none z-0" />

          <!-- Header -->
          <div class="relative z-10 flex items-center justify-between h-14 px-6 border-b border-gene-blue/15 shrink-0">
            <span class="font-mono text-[10px] tracking-[0.3em] text-gene-blue/70 uppercase">// Upload Generator</span>
            <button
              class="w-7 h-7 flex items-center justify-center border border-mist-3/30 text-mist-2 hover:text-slate-200 hover:border-gene-blue/40 transition-all duration-200 font-mono text-sm"
              @click="handleClose"
            >×</button>
          </div>

          <!-- Form -->
          <div class="relative z-10 flex-1 overflow-y-auto p-6">
            <form class="flex flex-col gap-5" @submit.prevent="handleSubmit">
              <!-- 名称 -->
              <div>
                <label class="block font-mono text-[10px] tracking-[0.3em] text-mist-2 uppercase mb-2">生成器名称 <span class="text-death-red">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  :maxlength="60"
                  placeholder="最多 60 个字符"
                  class="w-full font-sans text-sm bg-void border px-3 py-2 text-slate-200 placeholder:text-mist-3 transition-colors duration-200 focus:outline-none"
                  :class="errors.name ? 'border-death-red/60' : 'border-gene-blue/20 focus:border-gene-blue/60'"
                />
                <p v-if="errors.name" class="mt-1 font-mono text-[10px] text-death-red">{{ errors.name }}</p>
              </div>

              <!-- 描述 -->
              <div>
                <label class="block font-mono text-[10px] tracking-[0.3em] text-mist-2 uppercase mb-2">描述</label>
                <textarea
                  v-model="form.description"
                  :maxlength="200"
                  rows="3"
                  placeholder="简短描述这个生成器的用途，最多 200 字"
                  class="w-full font-sans text-sm bg-void border border-gene-blue/20 focus:border-gene-blue/60 px-3 py-2 text-slate-200 placeholder:text-mist-3 resize-none transition-colors duration-200 focus:outline-none"
                />
              </div>

              <!-- 平台 + 领域 -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block font-mono text-[10px] tracking-[0.3em] text-mist-2 uppercase mb-2">适用平台 <span class="text-death-red">*</span></label>
                  <select
                    v-model="form.platform"
                    class="w-full font-mono text-xs bg-void border px-3 py-2 text-slate-200 transition-colors duration-200 focus:outline-none appearance-none cursor-pointer"
                    :class="errors.platform ? 'border-death-red/60' : 'border-gene-blue/20 focus:border-gene-blue/60'"
                  >
                    <option value="" disabled>选择平台</option>
                    <option value="xiaohongshu">小红书</option>
                    <option value="douyin">抖音</option>
                    <option value="twitter">推特</option>
                    <option value="wechat">微信</option>
                    <option value="other">其他</option>
                  </select>
                  <p v-if="errors.platform" class="mt-1 font-mono text-[10px] text-death-red">{{ errors.platform }}</p>
                </div>
                <div>
                  <label class="block font-mono text-[10px] tracking-[0.3em] text-mist-2 uppercase mb-2">领域分类</label>
                  <!-- 预设选项 Tag 组 -->
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="d in DOMAIN_OPTIONS"
                      :key="d.value"
                      type="button"
                      class="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 border transition-all duration-200 cursor-pointer"
                      :class="domainSelect === d.value && domainSelect !== '__custom__'
                        ? 'border-gene-blue/60 text-gene-blue bg-gene-blue/10'
                        : 'border-mist-3/30 text-mist-3 hover:border-gene-blue/30 hover:text-gene-blue/60'"
                      @click="selectDomain(d.value)"
                    >{{ d.label }}</button>
                    <!-- 自定义触发按钮 -->
                    <button
                      type="button"
                      class="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 border transition-all duration-200 cursor-pointer"
                      :class="domainSelect === '__custom__'
                        ? 'border-gene-blue text-gene-blue bg-gene-blue/10'
                        : 'border-dashed border-mist-3/30 text-mist-3 hover:border-gene-blue/40 hover:text-gene-blue/60'"
                      @click="selectDomain('__custom__')"
                    >+ 自定义</button>
                  </div>
                  <!-- 自定义输入框：平滑展开 -->
                  <Transition
                    enter-active-class="transition-all duration-300 ease-out overflow-hidden"
                    enter-from-class="max-h-0 opacity-0 translate-y-[-4px]"
                    enter-to-class="max-h-20 opacity-100 translate-y-0"
                    leave-active-class="transition-all duration-200 ease-in overflow-hidden"
                    leave-from-class="max-h-20 opacity-100 translate-y-0"
                    leave-to-class="max-h-0 opacity-0 translate-y-[-4px]"
                  >
                    <div v-if="domainSelect === '__custom__'" class="mt-2">
                      <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-gene-blue/40 pointer-events-none">//</span>
                        <input
                          ref="domainInputRef"
                          v-model="form.domain"
                          type="text"
                          placeholder="输入自定义领域名称"
                          class="w-full font-mono text-xs bg-void border border-gene-blue/30 focus:border-gene-blue pl-8 pr-3 py-2 text-slate-200 placeholder:text-mist-3 transition-colors duration-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>

              <!-- 内容类型 -->
              <div>
                <label class="block font-mono text-[10px] tracking-[0.3em] text-mist-2 uppercase mb-2">内容类型 <span class="text-death-red">*</span></label>
                <div class="flex flex-wrap gap-2 mb-2">
                  <button
                    v-for="ct in CONTENT_TYPE_OPTIONS"
                    :key="ct"
                    type="button"
                    class="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 border transition-all duration-200 cursor-pointer"
                    :class="form.contentTypes.includes(ct)
                      ? 'border-gene-blue text-gene-blue bg-gene-blue/10'
                      : 'border-mist-3/40 text-mist-2 hover:border-gene-blue/40 hover:text-gene-blue/70'"
                    @click="toggleContentType(ct)"
                  >{{ ct }}</button>
                  <!-- 自定义内容类型 tags -->
                  <span
                    v-for="ct in customContentTypes"
                    :key="'custom-' + ct"
                    class="flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 border border-gene-blue text-gene-blue bg-gene-blue/10 cursor-default"
                  >
                    {{ ct }}
                    <button type="button" class="text-gene-blue/50 hover:text-death-red transition-colors cursor-pointer" @click="removeCustomContentType(ct)">×</button>
                  </span>
                </div>
                <!-- 自定义内容类型输入 -->
                <input
                  v-model="ctInput"
                  type="text"
                  placeholder="自定义内容类型，按 Enter 或逗号添加"
                  class="w-full font-mono text-xs bg-void border border-gene-blue/20 focus:border-gene-blue/40 px-3 py-1.5 text-slate-200 placeholder:text-mist-3 transition-colors duration-200 focus:outline-none"
                  @keydown.enter.prevent="addCustomContentType"
                  @keydown="onCtInputKey"
                />
                <p v-if="errors.contentTypes" class="mt-1 font-mono text-[10px] text-death-red">{{ errors.contentTypes }}</p>
              </div>

              <!-- 输出能力 -->
              <div>
                <label class="block font-mono text-[10px] tracking-[0.3em] text-mist-2 uppercase mb-2">输出能力 <span class="text-death-red">*</span></label>
                <div class="flex flex-wrap gap-1.5 mb-2">
                  <span
                    v-for="cap in form.outputCapabilities"
                    :key="cap"
                    class="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 bg-gene-blue/5 border border-gene-blue/20 text-gene-blue/80"
                  >
                    {{ cap }}
                    <button type="button" class="text-gene-blue/50 hover:text-death-red transition-colors cursor-pointer" @click="removeCapability(cap)">×</button>
                  </span>
                </div>
                <input
                  v-model="capInput"
                  type="text"
                  placeholder="输入后按 Enter 或逗号添加"
                  class="w-full font-mono text-xs bg-void border border-gene-blue/20 focus:border-gene-blue/60 px-3 py-2 text-slate-200 placeholder:text-mist-3 transition-colors duration-200 focus:outline-none"
                  @keydown.enter.prevent="addCapability"
                  @keydown="onCapInputKey"
                />
                <p v-if="errors.outputCapabilities" class="mt-1 font-mono text-[10px] text-death-red">{{ errors.outputCapabilities }}</p>
              </div>

              <!-- ZIP 上传区 -->
              <div>
                <label class="block font-mono text-[10px] tracking-[0.3em] text-mist-2 uppercase mb-2">Skill ZIP 包 <span class="text-death-red">*</span></label>
                <div
                  class="border-2 border-dashed transition-all duration-300 p-8 text-center cursor-pointer"
                  :class="[
                    isDragOver ? 'border-gene-blue bg-gene-blue/5' : 'border-gene-blue/20 hover:border-gene-blue/50',
                    errors.file ? 'border-death-red/50' : ''
                  ]"
                  @dragover.prevent="isDragOver = true"
                  @dragleave="isDragOver = false"
                  @drop.prevent="onDrop"
                  @click="fileInputRef?.click()"
                >
                  <input ref="fileInputRef" type="file" accept=".zip" class="hidden" @change="onFileChange" />
                  <div v-if="form.file">
                    <div class="font-mono text-xs text-gene-blue mb-1">{{ form.file.name }}</div>
                    <div class="font-mono text-[10px] text-mist-2">{{ fileSize }}</div>
                  </div>
                  <div v-else>
                    <div class="font-mono text-xs text-mist-2 mb-1">拖拽或点击选择 ZIP 文件</div>
                    <div class="font-mono text-[10px] text-mist-3">仅支持 .zip，最大 10MB</div>
                  </div>
                </div>
                <p v-if="errors.file" class="mt-1 font-mono text-[10px] text-death-red">{{ errors.file }}</p>
              </div>
            </form>
          </div>

          <!-- 底部操作 -->
          <div class="relative z-10 border-t border-gene-blue/10 px-6 py-4 flex items-center justify-between shrink-0">
            <button
              type="button"
              class="font-mono text-xs tracking-widest uppercase px-6 py-2 border border-mist-3/30 text-slate-400 hover:text-slate-200 hover:border-mist-3/60 transition-all duration-200"
              @click="handleClose"
            >取消</button>
            <button
              type="button"
              :disabled="uploading"
              class="font-mono text-xs tracking-widest uppercase px-8 py-2 border transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="uploading ? 'border-gene-blue/30 text-gene-blue/50' : 'bg-gene-blue/20 border-gene-blue/60 text-gene-blue hover:bg-gene-blue/30'"
              @click="handleSubmit"
            >
              <span v-if="uploading">上传中...</span>
              <span v-else>上传生成器</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'uploaded': []
}>()

const { upload, uploading } = useGeneratorUpload()
const { showToast } = useToast()

const CONTENT_TYPE_OPTIONS = ['图文', '视频脚本', '口播稿', '好物分享', '长文回答', '公众号文章', '推文', '专栏文章']

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const capInput = ref('')
const ctInput = ref('')
const customContentTypes = ref<string[]>([])

const DOMAIN_OPTIONS = [
  { label: '不限', value: '' },
  { label: '生活方式', value: '生活方式' },
  { label: '科技', value: '科技' },
  { label: '教育', value: '教育' },
  { label: '娱乐内容', value: '娱乐内容' },
  { label: '内容营销', value: '内容营销' },
  { label: '其他', value: '其他' },
]

const domainSelect = ref('')
const domainInputRef = ref<HTMLInputElement | null>(null)

function selectDomain(val: string) {
  domainSelect.value = val
  if (val !== '__custom__') {
    form.domain = val
  } else {
    form.domain = ''
    nextTick(() => domainInputRef.value?.focus())
  }
}

function addCustomContentType() {
  const val = ctInput.value.trim().replace(/,$/, '')
  if (val && !form.contentTypes.includes(val) && !customContentTypes.value.includes(val)) {
    customContentTypes.value.push(val)
    form.contentTypes.push(val)
  }
  ctInput.value = ''
}

function onCtInputKey(e: KeyboardEvent) {
  if (e.key === ',') { e.preventDefault(); addCustomContentType() }
}

function removeCustomContentType(ct: string) {
  customContentTypes.value = customContentTypes.value.filter(c => c !== ct)
  form.contentTypes = form.contentTypes.filter(c => c !== ct)
}

const form = reactive({
  name: '',
  description: '',
  platform: '',
  domain: '',
  contentTypes: [] as string[],
  outputCapabilities: [] as string[],
  file: null as File | null,
})

const errors = reactive<Record<string, string>>({})

const fileSize = computed(() => {
  if (!form.file) return ''
  const kb = form.file.size / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
})

function toggleContentType(ct: string) {
  const idx = form.contentTypes.indexOf(ct)
  if (idx >= 0) form.contentTypes.splice(idx, 1)
  else form.contentTypes.push(ct)
}

function addCapability() {
  const val = capInput.value.trim().replace(/,$/, '')
  if (val && !form.outputCapabilities.includes(val)) {
    form.outputCapabilities.push(val)
  }
  capInput.value = ''
}

function onCapInputKey(e: KeyboardEvent) {
  if (e.key === ',') { e.preventDefault(); addCapability() }
}

function removeCapability(cap: string) {
  form.outputCapabilities = form.outputCapabilities.filter(c => c !== cap)
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) setFile(file)
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setFile(file)
}

function setFile(file: File) {
  if (!file.name.endsWith('.zip')) { errors.file = '只支持 .zip 格式'; return }
  if (file.size > 10 * 1024 * 1024) { errors.file = '文件大小不能超过 10MB'; return }
  delete errors.file
  form.file = file
}

function validate(): boolean {
  Object.keys(errors).forEach(k => delete errors[k])
  let ok = true
  if (!form.name.trim()) { errors.name = '请填写生成器名称'; ok = false }
  if (!form.platform) { errors.platform = '请选择适用平台'; ok = false }
  if (form.contentTypes.length === 0) { errors.contentTypes = '至少选择一种内容类型'; ok = false }
  if (form.outputCapabilities.length === 0) { errors.outputCapabilities = '至少填写一个输出能力'; ok = false }
  if (!form.file) { errors.file = '请上传 Skill ZIP 包'; ok = false }
  return ok
}

async function handleSubmit() {
  if (!validate()) return
  try {
    const result = await upload({
      name: form.name,
      description: form.description,
      platform: form.platform,
      domain: form.domain,
      contentTypes: form.contentTypes,
      outputCapabilities: form.outputCapabilities,
      tags: [],
      file: form.file!,
    })
    showToast(`生成器已发布，Skill 路径：${result.skillPath}`)
    emit('uploaded')
    handleClose()
  } catch (e: any) {
    showToast(e?.message ?? '上传失败，请重试')
  }
}

function resetForm() {
  form.name = ''
  form.description = ''
  form.platform = ''
  form.domain = ''
  form.contentTypes = []
  form.outputCapabilities = []
  form.file = null
  capInput.value = ''
  ctInput.value = ''
  customContentTypes.value = []
  domainSelect.value = ''
  Object.keys(errors).forEach(k => delete errors[k])
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) handleClose()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>
