<template>
  <Teleport to="body">
    <Transition enter-active-class="transition-opacity duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" appear>
      <div class="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8 px-4" @click.self="handleBackdropClick">
        <div class="w-full max-w-3xl bg-void-2 border border-bio-green/20 flex flex-col">

          <!-- Header -->
          <div class="flex items-center justify-between px-8 py-5 border-b border-bio-green/10">
            <div>
              <div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase mb-1">// Seed Editor</div>
              <h2 class="font-serif text-xl text-slate-100">{{ isEdit ? '编辑种子' : '新建种子' }}</h2>
            </div>
            <button class="font-mono text-xs text-mist-2 hover:text-slate-300 border border-transparent hover:border-bio-green/20 px-2 py-1 transition-all duration-200" @click="handleClose">✕ 关闭</button>
          </div>

          <!-- Form -->
          <div class="px-8 py-6 flex flex-col gap-6">
            <!-- 标题 -->
            <div>
              <label class="block font-mono text-xs tracking-widest uppercase text-slate-400 mb-2">标题 <span class="text-death-red">*</span></label>
              <input ref="titleRef" v-model="form.title" type="text" maxlength="100" placeholder="种子标题，简短有力"
                class="w-full font-mono text-sm bg-void px-4 py-3 text-slate-200 placeholder:text-mist-3 focus:outline-none transition-colors duration-300"
                :class="titleError ? 'border border-death-red' : 'border border-bio-green/20 focus:border-bio-green/60'"
                @input="titleError = ''"
              />
              <p v-if="titleError" class="mt-1 font-mono text-xs text-death-red">{{ titleError }}</p>
            </div>

            <!-- 内容 -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="font-mono text-xs tracking-widest uppercase text-slate-400">内容</label>
                <button class="font-mono text-xs tracking-widest uppercase px-3 py-1 border border-bio-green/20 text-bio-green/60 hover:text-bio-green hover:border-bio-green/40 transition-all duration-200" @click="previewMode = !previewMode">{{ previewMode ? '// 编辑' : '// 预览' }}</button>
              </div>
              <textarea v-if="!previewMode" v-model="form.content" placeholder="记录你的核心意图、想法和洞察（支持 Markdown）"
                class="w-full font-mono text-sm bg-void border border-bio-green/20 focus:border-bio-green/60 focus:outline-none px-4 py-3 text-slate-300 placeholder:text-mist-3 resize-y transition-colors duration-300 leading-relaxed"
                style="min-height:240px"
              />
              <div v-else class="w-full min-h-[240px] bg-void border border-bio-green/10 px-4 py-3 prose prose-invert prose-sm max-w-none" v-html="renderedContent" />
            </div>

            <!-- 标签 -->
            <div class="relative">
              <label class="block font-mono text-xs tracking-widest uppercase text-slate-400 mb-2">标签</label>
              <div class="flex flex-wrap gap-2 mb-2">
                <span v-for="tag in form.tags" :key="tag" class="flex items-center gap-1 font-mono text-xs px-2 py-1 border border-bio-green/30 text-bio-green">
                  {{ tag }}
                  <button class="text-bio-green/50 hover:text-death-red transition-colors ml-1" @click="removeTag(tag)">✕</button>
                </span>
              </div>
              <div v-if="form.tags.length < 10" class="relative">
                <input v-model="tagInput" type="text" placeholder="输入标签后按 Enter 或逗号添加"
                  class="w-full font-mono text-xs bg-void border border-bio-green/20 focus:border-bio-green/60 focus:outline-none px-3 py-2 text-slate-300 placeholder:text-mist-3 transition-colors duration-300"
                  @keydown.enter.prevent="addTag"
                  @keydown="handleTagKeydown"
                  @input="handleTagInput"
                  @blur="() => setTimeout(() => { showSuggestions = false }, 150)"
                />
                <div v-if="showSuggestions && suggestions.length" class="absolute z-10 w-full bg-void-2 border border-bio-green/20 mt-1">
                  <button v-for="s in suggestions" :key="s" class="w-full text-left font-mono text-xs px-3 py-2 text-slate-300 hover:bg-bio-green/10 hover:text-bio-green transition-colors duration-150" @mousedown.prevent="selectSuggestion(s)">{{ s }}</button>
                </div>
              </div>
              <p v-else class="font-mono text-xs text-mist-2">最多添加 10 个标签</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-8 py-5 border-t border-bio-green/10">
            <span class="font-mono text-xs text-mist-3">{{ isEdit ? '编辑模式 · 状态变更请在卡片操作' : '新建模式' }}</span>
            <div class="flex items-center gap-3">
              <button v-if="!isEdit" :disabled="submitting"
                class="font-mono text-xs tracking-widest uppercase px-6 py-2.5 border border-bio-green/40 text-bio-green hover:border-bio-green hover:bg-bio-green/10 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                @click="handleSaveDraft"
              >{{ submitting ? '保存中...' : '保存草稿' }}</button>
              <button :disabled="submitting"
                class="font-mono text-xs tracking-widest uppercase px-6 py-2.5 bg-bio-green text-void hover:bg-bio-green/80 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                @click="isEdit ? handleUpdate() : handlePublish()"
              >{{ submitting ? '保存中...' : (isEdit ? '保存更改' : '发布种子') }}</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    <ConfirmDialog v-if="showUnsavedConfirm" message="有未保存的内容，确认放弃？" @confirm="forceClose" @cancel="showUnsavedConfirm = false" />
  </Teleport>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { Seed } from '~/composables/useSeedRepository'

const props = defineProps<{ seed: Seed | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { saveDraft, publishSeed, updateSeed } = useSeedRepository()
const { fetchTags, tags: allTags } = useTagRepository()
const { showToast } = useToast()

const isEdit = computed(() => !!props.seed)

// 表单状态
const form = reactive({
  title: props.seed?.title ?? '',
  content: '',
  tags: [...(props.seed?.tags ?? [])],
})

// 编辑模式：加载种子完整内容
if (props.seed) {
  $fetch<{ code: number; data: Seed }>(`/api/seeds/${props.seed.id}`)
    .then(res => { form.content = res.data?.content ?? '' })
    .catch(() => {})
}

// 脏数据检测
const initialSnapshot = JSON.stringify({ title: props.seed?.title ?? '', content: '', tags: props.seed?.tags ?? [] })
const isDirty = computed(() =>
  JSON.stringify({ title: form.title, content: form.content, tags: form.tags }) !== initialSnapshot
)

// UI 状态
const titleRef = ref<HTMLInputElement | null>(null)
const titleError = ref('')
const previewMode = ref(false)
const submitting = ref(false)
const showUnsavedConfirm = ref(false)

// Markdown 预览
const renderedContent = computed(() => {
  if (!form.content) return '<p class="text-mist-3 font-mono text-xs">// 暂无内容</p>'
  return DOMPurify.sanitize(marked.parse(form.content) as string)
})

// 标签
const tagInput = ref('')
const showSuggestions = ref(false)
const suggestions = computed(() => {
  if (!tagInput.value.trim()) return []
  const kw = tagInput.value.toLowerCase()
  return allTags.value
    .filter(t => t.toLowerCase().includes(kw) && !form.tags.includes(t))
    .slice(0, 5)
})

async function handleTagInput() {
  await fetchTags()
  showSuggestions.value = true
}

function handleTagKeydown(e: KeyboardEvent) {
  if (e.key === ',') { e.preventDefault(); addTag() }
}

function addTag() {
  const t = tagInput.value.trim().replace(/,/g, '')
  if (t && !form.tags.includes(t) && form.tags.length < 10) {
    form.tags.push(t)
  }
  tagInput.value = ''
  showSuggestions.value = false
}

function selectSuggestion(s: string) {
  if (!form.tags.includes(s) && form.tags.length < 10) form.tags.push(s)
  tagInput.value = ''
  showSuggestions.value = false
}

function removeTag(tag: string) {
  form.tags = form.tags.filter(t => t !== tag)
}

// 表单验证
function validate() {
  if (!form.title.trim()) {
    titleError.value = '标题不能为空'
    titleRef.value?.focus()
    return false
  }
  return true
}

// 关闭逻辑
function handleClose() {
  if (isDirty.value) { showUnsavedConfirm.value = true } else { forceClose() }
}

function handleBackdropClick() { handleClose() }

function forceClose() {
  showUnsavedConfirm.value = false
  emit('close')
}

// 提交
async function handleSaveDraft() {
  if (!validate()) return
  submitting.value = true
  try {
    await saveDraft({ title: form.title, content: form.content, tags: form.tags })
    showToast('种子已保存为草稿')
    emit('saved')
  } catch {
    showToast('保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function handlePublish() {
  if (!validate()) return
  submitting.value = true
  try {
    await publishSeed({ title: form.title, content: form.content, tags: form.tags })
    showToast('种子已发布，可以开始生成果实了')
    emit('saved')
  } catch {
    showToast('发布失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function handleUpdate() {
  if (!validate()) return
  submitting.value = true
  try {
    await updateSeed(props.seed!.id, { title: form.title, content: form.content, tags: form.tags })
    showToast('种子已更新')
    emit('saved')
  } catch {
    showToast('保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

// Escape 键关闭
onMounted(() => {
  nextTick(() => titleRef.value?.focus())
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
  document.addEventListener('keydown', handler)
  onUnmounted(() => document.removeEventListener('keydown', handler))
})
</script>
