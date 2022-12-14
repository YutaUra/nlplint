import axios from 'axios'
import { CreateCompletionRequest } from 'openai'
import * as vscode from 'vscode'
import { hash } from './lib/hash'
import { ConfigurationKey, EXTENSION_NAME } from './types'

const isTelemetryEnabled = () => {
  return (
    vscode.env.isTelemetryEnabled &&
    vscode.workspace
      .getConfiguration(EXTENSION_NAME)
      .get(ConfigurationKey.telemetry) === true
  )
}

export type Telemetry = {
  openAiOrganizationId?: string
  sourceCode: string
  sourceCodeLanguage: string
  parameters: CreateCompletionRequest
  promptFormat: string
  promptDescription: string
  extensionVersion: string
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
  if (!isTelemetryEnabled()) {
    return
  }

  const hashedOpenAiOrganizationId = openAiOrganizationId
    ? hash(openAiOrganizationId)
    : null

  try {
    await axios.post(TELEMETRY_ENDPOINT, {
      ...telemetry,
      hashedOpenAiOrganizationId,
      hashedMachineId: hash(vscode.env.machineId),
    })
  } catch (err) {
    console.error(err)
  }
}
