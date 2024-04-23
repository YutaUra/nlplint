import { Configuration, CreateCompletionRequest, OpenAIApi } from 'openai'
import { OUTPUT_FORMAT_REGEXP } from '../getPrompt'
import * as format from 'string-format'
import axios from 'axios'
import { config } from 'dotenv'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PROMPTS } from './sample-prompt'

PROMPTS.forEach(({ prompt, description }) => {
  console.log(description)
  console.log()
  console.log(prompt)
  console.log('=====================')
})
config()

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env['OPEN_AI_ACCESS_TOKEN'],
  }),
)
const HASHED_MACHINE_ID = `local-test-${new Date().toLocaleString()}`
type PromptsIndex = 0 | 1 | 2 | 3 | 4
const MAX_ITERATION = 5
const PROMPT_LENGTH = PROMPTS.length
const API_LIMITATION_PER_MINUTE = 10
const ITERATION_TIME_MS = (1000 * 60) / API_LIMITATION_PER_MINUTE
const USE_DUMMY_COMPLETION = false

const getPrompt = async (idx: PromptsIndex) => {
  return PROMPTS[idx]
}

const showErrorMessage = (message: string) => {
  console.error(`\x1b[2K\r\x1b[31m${message}\x1b[39m`)
}

const runCompletion = async (
  text: string,
  idx: PromptsIndex,
): Promise<
  { success: true; score: number } | { success: false; error: string }
> => {
  const { prompt: promptFormat, description: promptDescription } =
    await getPrompt(idx)

  const prompt = format(promptFormat, {
    code: text,
    preferredLanguage: 'japanese',
  })

  const parameters: CreateCompletionRequest = {
    model: 'code-davinci-002',
    temperature: 0.9,
    prompt,
    max_tokens: 256,
    stop: '````\n',
  }

  try {
    const response = await openai.createCompletion(parameters, {
      timeout: 1000 * 60 * 1,
    })

    const result = response.data.choices[0].text

    if (!result) {
      showErrorMessage('No result')
      return {
        success: false,
        error: 'No result',
      }
    }

    const match = result.match(OUTPUT_FORMAT_REGEXP)
    if (!match) {
      showErrorMessage(`Invalid result. result is \n"""\n${result}\n"""`)
      return {
        success: false,
        error: `Invalid result. result is \n"""\n${result}\n"""`,
      }
    }
    const score = parseFloat(match.groups?.score ?? '')
    const description = (match.groups?.description ?? '')
      .replace(/````$/, '')
      .trim()

    if (Number.isNaN(score)) {
      showErrorMessage(`Invalid score ${score}`)
      return {
        success: false,
        error: `Invalid score ${score}`,
      }
    }
    return { success: true, score }
  } catch (err) {
    if (!axios.isAxiosError(err)) {
      if (err instanceof Error) {
        showErrorMessage(err.message)
        return { success: false, error: err.message }
      } else {
        showErrorMessage(String(err))
        return { success: false, error: String(err) }
      }
    } else {
      const errorMessage =
        err.response?.data?.error?.message ?? "Unknown OpenAI's error"
      showErrorMessage(errorMessage)
      return { success: false, error: errorMessage }
    }
  }
}

const runCompletionDummy = async (
  _: string,
): Promise<
  { success: true; score: number } | { success: false; error: string }
> => {
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(500 + Math.random() * 1000)),
  )
  if (Math.random() > 0.5) {
    return { success: true, score: Math.floor(Math.random() * 100) }
  }
  showErrorMessage('dummy error')
  return {
    success: false,
    error: `dummy error ${Math.floor(Math.random() * 10)}`,
  }
}

// 配列をシャッフルする
const shuffle = <T>(array: T[]) => {
  const _array = [...array]
  for (let i = _array.length - 1; i >= 0; i--) {
    const rand = Math.floor(Math.random() * (i + 1))
    ;[_array[i], _array[rand]] = [_array[rand], _array[i]]
  }
  return _array
}

const main = async () => {
  const jsonText = await readFile(join(process.cwd(), 'db.json'), 'utf-8')
  const _json = JSON.parse(jsonText) as {
    id: string
    repositoryId: string
    path: string
    name: string
    content: string
    repository: {
      id: string
      author: string
      name: string
      license: string
      url: string
      commitHash: null | string
    }
  }[]

  // content length 15%点・85%点を計算する
  const contentLengths = _json
    .map((x) => x.content.length)
    .sort((a, b) => a - b)
  const p15 = contentLengths[Math.floor(contentLengths.length * 0.15)]
  const p85 = contentLengths[Math.floor(contentLengths.length * 0.85)]

  // content length 15%点・85%点の間のものだけを選択してランダムな100件を選択する
  const selectedJson = shuffle(
    _json.filter((x) => p15 <= x.content.length && x.content.length <= p85),
  ).slice(0, 100)

  /**
   * json[].content で runCompletion を繰り返し呼び出す。
   * ただ、APIの制限により、1分に20回までしか呼び出せない。
   * 従って、1分に20回呼び出すように適宜sleepを挟む必要がある。
   */

  const ALL_COUNT = selectedJson.length * MAX_ITERATION * PROMPT_LENGTH
  const ALL_COUNT_DIGIT_COUNT = Math.floor(Math.log10(ALL_COUNT)) + 1
  const summary = {
    successCount: 0,
    failureCount: 0,
    successTotalScore: 0,
    errorReasons: new Map<string, number>(),
    startAt: new Date(),
  }

  /**
   * 進捗を表示する
   *
   * フォーマット：
   * [<完了した数.全体の数と同じ幅にパディング>/<全体の数> 完了率 <経過時間.時:分:秒>/<予想完了時間.時:分:秒>] success rate: <成功率.%> average score: <成功したものの平均スコア>
   *
   * 直前の表示を消して、新しい表示をするようにする
   */
  const showProgress = () => {
    const now = new Date()
    const elapsed = (now.getTime() - summary.startAt.getTime()) / 1000
    const elapsedHours = Math.floor(elapsed / 3600)
    const elapsedMinutes = Math.floor((elapsed % 3600) / 60)
    const elapsedSeconds = Math.floor(elapsed % 60)
    const elapsedString = `${String(elapsedHours).padStart(2, '0')}:${String(
      elapsedMinutes,
    ).padStart(2, '0')}:${String(elapsedSeconds).padStart(2, '0')}`

    const completedCount = summary.successCount + summary.failureCount

    const completedRate = (completedCount / ALL_COUNT) * 100

    const estimatedTime = (elapsed / completedCount) * ALL_COUNT || 0
    const estimatedHours = Math.floor(estimatedTime / 3600)
    const estimatedMinutes = Math.floor((estimatedTime % 3600) / 60)
    const estimatedSeconds = Math.floor(estimatedTime % 60)
    const estimatedString = `${String(estimatedHours).padStart(
      2,
      '0',
    )}:${String(estimatedMinutes).padStart(2, '0')}:${String(
      estimatedSeconds,
    ).padStart(2, '0')}`

    const successRate = (summary.successCount / completedCount) * 100 || 0
    const averageScore = summary.successTotalScore / summary.successCount || 0

    const progressString = `[${String(completedCount).padStart(
      ALL_COUNT_DIGIT_COUNT,
    )}/${ALL_COUNT} ${completedRate.toFixed(
      2,
    )}% ${elapsedString}/${estimatedString}] success rate: ${successRate.toFixed(
      1,
    )}% average score: ${averageScore.toFixed(2)}`

    process.stdout.write(`\r${progressString}`)
  }

  showProgress()
  for (let count = 0; count < MAX_ITERATION; count++) {
    for (let index = 0 as PromptsIndex; index < PROMPT_LENGTH; index++) {
      for (const { content } of selectedJson) {
        // console.time(`\x1b[2K\rrunCompletion ${count} ${index}`)
        const iterationStartAt = new Date().getTime()
        const result = USE_DUMMY_COMPLETION
          ? await runCompletionDummy(content)
          : await runCompletion(content, index)

        if (result.success) {
          summary.successCount++
          summary.successTotalScore += result.score
        } else {
          summary.failureCount++
          summary.errorReasons.set(
            result.error,
            (summary.errorReasons.get(result.error) ?? 0) + 1,
          )
        }

        await new Promise((resolve) => {
          const iterationEndAt = new Date().getTime()
          const waitTime =
            ITERATION_TIME_MS -
            (iterationEndAt - iterationStartAt) +
            ITERATION_TIME_MS / 10 // 10%の余裕を持つ
          setTimeout(resolve, waitTime)
          showProgress()
        })
        // console.timeEnd(`\x1b[2K\rrunCompletion ${count} ${index}`)
      }
    }
  }

  await writeFile(
    join(process.cwd(), 'output.json'),
    JSON.stringify(
      {
        ...summary,
        errorReasons: Object.fromEntries(
          [...summary.errorReasons].sort(([a], [b]) => b.localeCompare(a)),
        ),
      },
      null,
      2,
    ),
  )
}

// main().then(() => console.log('done'))
