import axios from 'axios'
import { CreateCompletionRequest } from 'openai'
import { hash } from './lib/hash'

export type Telemetry = {
  openAiOrganizationId?: string
  sourceCode: string
  sourceCodeLanguage: string
  parameters: CreateCompletionRequest
  promptFormat: string
  promptDescription: string
  extensionVersion: string
  hashedMachineId: string
} & (
  | {
      isSuccess: true
      resultScore: number
      resultDescription: string
    }
  | {
      isSuccess: false
      errorMessage: string
    }
)

const TELEMETRY_ENDPOINT =
  'https://us-central1-nlplint.cloudfunctions.net/telemetry'

export const createTelemetry = async ({
  openAiOrganizationId,
  ...telemetry
}: Telemetry) => {
  const hashedOpenAiOrganizationId = openAiOrganizationId
    ? hash(openAiOrganizationId)
    : null

  try {
    await axios.post(TELEMETRY_ENDPOINT, {
      ...telemetry,
      hashedOpenAiOrganizationId,
    })
  } catch (err) {
    console.error(err)
  }
}
