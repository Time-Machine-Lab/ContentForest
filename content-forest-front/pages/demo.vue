<template>
  <div class="min-h-screen bg-void text-slate-200">
    <HeroNav />
    <main class="pt-24 pb-20 px-6 md:px-12 max-w-4xl mx-auto">
      <div class="mb-12">
        <div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase mb-3">// Interactive Demo</div>
        <h1 class="font-serif text-4xl md:text-5xl text-slate-100 mb-3">看进化发生</h1>
        <p class="font-mono text-sm text-mist-2">选一颗种子，看内容如何生长、变异、进化。</p>
      </div>
      <div class="flex items-center gap-1 mb-10">
        <template v-for="(s, i) in steps" :key="i">
          <div class="w-6 h-6 rounded-full border font-mono text-xs flex items-center justify-center transition-all duration-300"
               :class="step>i ? 'bg-bio-green border-bio-green text-void' : step===i ? 'border-bio-green text-bio-green' : 'border-mist-3/30 text-mist-2'">{{ i+1 }}</div>
          <span class="hidden md:block font-mono text-xs mx-1" :class="step>=i ? 'text-slate-300' : 'text-mist-2'">{{ s }}</span>
          <div v-if="i<steps.length-1" class="w-6 h-px mx-1" :class="step>i ? 'bg-bio-green/50' : 'bg-mist-3/20'"></div>
        </template>
      </div>

      <!-- step 0: 选种子 -->
      <div v-if="step===0">
        <div class="font-mono text-xs text-mist-2 uppercase tracking-wider mb-4">// 选择你的种子</div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div v-for="seed in seeds" :key="seed.id"
               class="border p-5 cursor-pointer transition-all duration-300"
               :class="selectedSeed?.id===seed.id ? 'border-bio-green/60 bg-bio-green/5' : 'border-mist-3/20 hover:border-mist-3/40'"
               @click="selectedSeed=seed">
            <div class="font-mono text-xs text-mutation uppercase tracking-wider mb-2">{{ seed.platform }}</div>
            <div class="font-serif text-lg text-slate-100 mb-2">{{ seed.title }}</div>
            <div class="font-mono text-xs text-mist-2">受众：{{ seed.audience }}</div>
            <div class="font-mono text-xs text-mist-2">语气：{{ seed.tone }}</div>
          </div>
        </div>
        <button @click="generate" :disabled="!selectedSeed"
                class="font-mono text-sm tracking-widest uppercase px-8 py-3 transition-all duration-300"
                :class="selectedSeed ? 'bg-bio-green text-void cursor-pointer hover:bg-bio-green/80' : 'bg-void-3 text-mist-2 cursor-not-allowed'">
          Generate Fruits →
        </button>
      </div>

      <!-- step 1: 加载 -->
      <div v-else-if="step===1" class="py-20 text-center">
        <div class="font-mono text-xs text-mist-2 mb-6">营养库加载中...</div>
        <div class="flex justify-center gap-2 mb-6">
          <div v-for="n in 3" :key="n" class="w-2 h-2 rounded-full bg-bio-green animate-bounce"
               :style="{animationDelay:(n-1)*150+'ms'}"></div>
        </div>
        <div class="space-y-2 max-w-xs mx-auto">
          <div v-for="bar in loadingBars" :key="bar.label" class="flex items-center gap-3">
            <span class="font-mono text-xs text-mist-2 w-16">{{ bar.label }}</span>
            <div class="flex-1 h-1 bg-void-3 rounded overflow-hidden">
              <div class="h-full rounded" :style="{background:bar.color, animation:'loadBar 0.8s ease forwards', animationDelay:bar.delay}"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- step 2: 选果实 -->
      <div v-else-if="step===2">
        <div class="font-mono text-xs text-mist-2 uppercase tracking-wider mb-4">// 3个果实变体 — Pick Up 你中意的</div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div v-for="(fruit, fi) in currentFruits" :key="fi"
               class="border p-5 cursor-pointer transition-all duration-300"
               :class="fruitCardClass(fruit)"
               @click="pickedFruit=fruit">
            <div class="flex items-center justify-between mb-3">
              <span class="font-mono text-xs uppercase tracking-wider"
                    :class="fruit.isMutation?'text-death-red':'text-mutation'">
                {{ fruit.isMutation ? 'MUTATION' : 'Variant ' + fruitLabel(fi) }}
              </span>
              <span class="font-mono text-xs text-mist-2">{{ fruit.estReach }}</span>
            </div>
            <div class="font-serif text-base text-slate-100 mb-3 leading-snug">{{ fruit.title }}</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="tag in fruit.tags" :key="tag"
                    class="font-mono text-xs px-1.5 py-0.5 border border-mist-3/20 text-mist-2">{{ tag }}</span>
            </div>
          </div>
        </div>
        <button @click="pickup" :disabled="!pickedFruit"
                class="font-mono text-sm tracking-widest uppercase px-8 py-3 transition-all duration-300"
                :class="pickedFruit ? 'bg-mutation text-void cursor-pointer hover:bg-mutation/80' : 'bg-void-3 text-mist-2 cursor-not-allowed'">
          Pick Up ▲
        </button>
      </div>

      <!-- step 3: 果实详情 -->
      <div v-else-if="step===3 && pickedFruit">
        <div class="font-mono text-xs text-mist-2 uppercase tracking-wider mb-4">// 选中的果实</div>
        <div class="border border-bio-green/30 bg-bio-green/5 p-6 md:p-8 mb-6">
          <div class="font-mono text-xs text-bio-green uppercase tracking-wider mb-3">picked · {{ selectedSeed?.platform }}</div>
          <h2 class="font-serif text-2xl text-slate-100 mb-4">{{ pickedFruit.title }}</h2>
          <p class="text-slate-400 text-sm leading-relaxed mb-4">{{ pickedFruit.body }}</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in pickedFruit.tags" :key="tag"
                  class="font-mono text-xs px-2 py-1 border border-bio-green/30 text-bio-green/80">{{ tag }}</span>
          </div>
        </div>
        <button @click="step=4"
                class="font-mono text-sm tracking-widest uppercase px-8 py-3 bg-gene-blue text-void cursor-pointer hover:bg-gene-blue/80 transition-all">
          查看模拟指标 →
        </button>
      </div>

      <!-- step 4: 指标 -->
      <div v-else-if="step===4 && pickedFruit">
        <div class="font-mono text-xs text-mist-2 uppercase tracking-wider mb-4">// 发布后模拟数据</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div v-for="m in pickedFruit.metrics" :key="m.label"
               class="border border-mist-3/20 bg-void-2/60 p-4 text-center">
            <div class="font-mono text-2xl font-bold mb-1" :style="{color:m.color}">{{ m.value }}</div>
            <div class="font-mono text-xs text-mist-2">{{ m.label }}</div>
          </div>
        </div>
        <div class="border border-bio-green/20 bg-void-2/40 p-5 mb-6">
          <div class="font-mono text-xs text-bio-green mb-2">// 系统学习到了什么</div>
          <ul class="space-y-1">
            <li v-for="insight in pickedFruit.insights" :key="insight"
                class="font-mono text-xs text-slate-400 flex items-start gap-2">
              <span class="text-bio-green">+</span>{{ insight }}
            </li>
          </ul>
        </div>
        <div class="flex gap-3 flex-wrap">
          <button @click="reset"
                  class="font-mono text-sm tracking-widest uppercase px-6 py-3 border border-bio-green/50 text-bio-green hover:bg-bio-green hover:text-void transition-all">
            再来一轮 ↺
          </button>
          <a href="/#waitlist"
             class="font-mono text-sm tracking-widest uppercase px-6 py-3 bg-bio-green text-void hover:bg-bio-green/80 transition-all">
            我要内测 →
          </a>
        </div>
      </div>
    </main>
  </div>
</template>


<script setup lang="ts">
definePageMeta({ ssr: false })
useSeoMeta({ title: 'Demo · Content Forest', description: '体验内容进化的完整循环' })

const step = ref(0)
const steps = ['选种子', '加载', '选果实', '查看内容', '看数据']

interface Seed { id: string; platform: string; title: string; audience: string; tone: string }
interface Fruit {
  title: string; body: string; tags: string[]; estReach: string; isMutation?: boolean
  metrics: { label: string; value: string; color: string }[]
  insights: string[]
}

const seeds: Seed[] = [
  { id: 'ai', platform: '小红书', title: 'AI效率工具推广', audience: '职场打工人', tone: '干货实用' },
  { id: 'fitness', platform: '抖音', title: '在家健身计划', audience: '25-35岁女性', tone: '温暖激励' },
  { id: 'career', platform: 'LinkedIn', title: '程序员副业变现', audience: '开发者', tone: '专业克制' },
]

const fruitData: Record<string, Fruit[]> = {
  ai: [
    {
      title: '我用这3个AI工具，每天节省2小时摸鱼时间',
      body: '打工人必看！这3个被严重低估的AI工具，让我从996变成了"看起来很忙"。第一个工具...',
      tags: ['AI工具', '效率', '职场', '打工人'],
      estReach: '~8,000',
      metrics: [
        { label: '点赞', value: '1,247', color: '#00ff9f' },
        { label: '收藏', value: '892', color: '#f59e0b' },
        { label: '完播率', value: '73%', color: '#0ea5e9' },
        { label: '转化', value: '4.2%', color: '#00ff9f' },
      ],
      insights: ['故事感标题点击率 +34%', '「摸鱼」等口语词提升共鸣', '3个以内的列表结构最易收藏'],
    },
    {
      title: '老板看了会生气：AI让我1小时完成8小时工作',
      body: '声明：此文章不适合"努力就是美德"的读者。如果你也想用聪明代替勤奋...',
      tags: ['AI', '效率革命', '职场', '反内卷'],
      estReach: '~12,000',
      metrics: [
        { label: '点赞', value: '2,103', color: '#00ff9f' },
        { label: '收藏', value: '1,456', color: '#f59e0b' },
        { label: '完播率', value: '81%', color: '#0ea5e9' },
        { label: '转化', value: '6.8%', color: '#00ff9f' },
      ],
      insights: ['反常识标题 CTR 高出均值 2.1x', '情绪共鸣词「反内卷」触发转发', '开篇声明结构增加停留时长'],
    },
    {
      title: '【突变体】如果AI是你同事，它会被开除吗？',
      body: '我们给AI布置了一周的真实工作任务，结果出乎意料——它没被开除，反而...',
      tags: ['AI测评', '创意', '职场实验'],
      estReach: '~5,000',
      isMutation: true,
      metrics: [
        { label: '点赞', value: '456', color: '#00ff9f' },
        { label: '收藏', value: '234', color: '#f59e0b' },
        { label: '完播率', value: '45%', color: '#0ea5e9' },
        { label: '转化', value: '1.2%', color: '#ef4444' },
      ],
      insights: ['实验性叙事吸引新受众群体', '完播率低但评论互动高', '突变基因「AI拟人化」值得后续探索'],
    },
  ],
  fitness: [
    {
      title: '30天不出门，我瘦了8斤——全靠这套15分钟动作',
      body: '不用健身房，不用器材，客厅就能做。我从完全不运动到每天主动想练...',
      tags: ['居家健身', '减脂', '15分钟', '零器材'],
      estReach: '~15,000',
      metrics: [
        { label: '点赞', value: '3,891', color: '#00ff9f' },
        { label: '收藏', value: '2,734', color: '#f59e0b' },
        { label: '完播率', value: '88%', color: '#0ea5e9' },
        { label: '转化', value: '8.1%', color: '#00ff9f' },
      ],
      insights: ['具体数字「8斤/30天」大幅提升信任感', '「15分钟」降低启动门槛', '真实故事结构收藏率翻倍'],
    },
    {
      title: '月经期也能练？妇科医生告诉你真相',
      body: '这个问题困扰了我很久，终于找到专业人士解答。医生说：不仅能练，而且...',
      tags: ['女性健康', '健身', '科普', '经期'],
      estReach: '~9,000',
      metrics: [
        { label: '点赞', value: '1,567', color: '#00ff9f' },
        { label: '收藏', value: '3,102', color: '#f59e0b' },
        { label: '完播率', value: '79%', color: '#0ea5e9' },
        { label: '转化', value: '5.3%', color: '#00ff9f' },
      ],
      insights: ['专业背书大幅提升收藏而非点赞', '垂直女性话题受众精准', '解答痛点问题收藏率比点赞高2x'],
    },
    {
      title: '【突变体】如果把健身当游戏，打怪升级会发生什么',
      body: '我给自己设计了一套「健身RPG系统」：每次运动获得经验值，到达里程碑解锁奖励...',
      tags: ['健身游戏化', '创意', '打卡'],
      estReach: '~4,000',
      isMutation: true,
      metrics: [
        { label: '点赞', value: '678', color: '#00ff9f' },
        { label: '收藏', value: '389', color: '#f59e0b' },
        { label: '完播率', value: '52%', color: '#0ea5e9' },
        { label: '转化', value: '2.1%', color: '#f59e0b' },
      ],
      insights: ['游戏化概念吸引Z世代新受众', '评论区互动质量高于均值', '「RPG系统」概念可继续深挖'],
    },
  ],
  career: [
    {
      title: "I built a SaaS in 2 weeks — here's what I learned",
      body: "Week 1 was shipping. Week 2 was learning why nobody used it. Here are the 5 lessons...",
      tags: ['SaaS', 'indie hacker', 'build in public'],
      estReach: '~6,000',
      metrics: [
        { label: 'Likes', value: '892', color: '#00ff9f' },
        { label: 'Comments', value: '134', color: '#f59e0b' },
        { label: 'Reposts', value: '67', color: '#0ea5e9' },
        { label: 'CTR', value: '3.4%', color: '#00ff9f' },
      ],
      insights: ['Build-in-public格式产生高评论互动', '「失败反思」比「成功展示」转发率高', '具体时间线增加可信度'],
    },
    {
      title: "My side project hit $1k MRR. I almost quit 3 times.",
      body: "The timeline: Month 1 — zero users. Month 3 — $47. Month 6 — $1,000. Here's the real story...",
      tags: ['MRR', 'side project', 'developer'],
      estReach: '~11,000',
      metrics: [
        { label: 'Likes', value: '2,341', color: '#00ff9f' },
        { label: 'Comments', value: '289', color: '#f59e0b' },
        { label: 'Reposts', value: '198', color: '#0ea5e9' },
        { label: 'CTR', value: '7.2%', color: '#00ff9f' },
      ],
      insights: ['收入里程碑 + 情绪波折是最强传播组合', '具体数字时间线建立真实感', '$1k MRR是开发者的情感锚点'],
    },
    {
      title: '【突变体】What if your side project IS your main project?',
      body: "A thought experiment: what if we've been thinking about this backwards all along...",
      tags: ['mindset', 'career', 'contrarian'],
      estReach: '~3,000',
      isMutation: true,
      metrics: [
        { label: 'Likes', value: '345', color: '#00ff9f' },
        { label: 'Comments', value: '89', color: '#f59e0b' },
        { label: 'Reposts', value: '45', color: '#0ea5e9' },
        { label: 'CTR', value: '1.8%', color: '#f59e0b' },
      ],
      insights: ['哲学性问题吸引思考型受众', '评论质量高但转化低', '反常识角度值得在newsletter渠道测试'],
    },
  ],
}

const loadingBars = [
  { label: '平台规则', color: '#00ff9f', delay: '0ms' },
  { label: '垂直知识', color: '#0ea5e9', delay: '200ms' },
  { label: '历史经验', color: '#f59e0b', delay: '400ms' },
]

const selectedSeed = ref<Seed | null>(null)
const pickedFruit = ref<Fruit | null>(null)
const currentFruits = ref<Fruit[]>([])

function fruitLabel(i: number) { return String.fromCharCode(65 + i) }

function fruitCardClass(fruit: Fruit) {
  const isMut = fruit.isMutation
  const base = isMut ? 'border-death-red/30 hover:border-death-red/60' : 'border-mutation/20 hover:border-mutation/50'
  const isPicked = pickedFruit.value?.title === fruit.title
  const picked = isPicked ? (isMut ? 'bg-death-red/5 border-death-red/60' : 'bg-mutation/5 border-mutation/50') : ''
  return picked ? base + ' ' + picked : base
}

function generate() {
  if (!selectedSeed.value) return
  const id = selectedSeed.value.id
  currentFruits.value = fruitData[id] ?? []
  step.value = 2
}

function pickup() {
  if (!pickedFruit.value) return
  step.value = 3
}

function reset() {
  step.value = 0
  selectedSeed.value = null
  pickedFruit.value = null
  currentFruits.value = []
}
</script>
