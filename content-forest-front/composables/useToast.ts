// 单例状态，跨组件共享
const message = ref('')
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
  function showToast(msg: string, duration = 3000) {
    if (timer) clearTimeout(timer)
    message.value = msg
    visible.value = true
    timer = setTimeout(() => {
      visible.value = false
    }, duration)
  }

  return { message, visible, showToast }
}
