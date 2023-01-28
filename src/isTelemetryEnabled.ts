import * as vscode from 'vscode'
import { ConfigurationKey, EXTENSION_NAME } from './types'

export const isTelemetryEnabled = () => {
  return (
    vscode.env.isTelemetryEnabled &&
    vscode.workspace
      .getConfiguration(EXTENSION_NAME)
      .get(ConfigurationKey.telemetry) === true
  )
}
