/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode'
import axios from 'axios'
import { Configuration, CreateCompletionRequest, OpenAIApi } from 'openai'
import { ConfigurationKey, EXTENSION_NAME, SecretsKey } from './types'
import * as format from 'string-format'
import { getPrompt, OUTPUT_FORMAT_REGEXP } from './getPrompt'
import { hash } from './lib/hash'

export function activate(context: vscode.ExtensionContext) {
  const VERSION = vscode.extensions.getExtension(EXTENSION_NAME)?.packageJSON
    .version as string
  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTENSION_NAME}.nlplint`, async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Linting with NLP...',
          cancellable: true,
        },
        async (progress, token) => {
          if (!vscode.window.activeTextEditor) {
            return
          }
          const cancelToken = axios.CancelToken.source()
          token.onCancellationRequested(() => {
            cancelToken.cancel()
          })

          const { document } = vscode.window.activeTextEditor
          const text = document.getText()

          const openAIAccessToken = await context.secrets.get(
            SecretsKey.openAIAccessToken,
          )
          if (!openAIAccessToken) {
            await vscode.window.showErrorMessage(
              'Access token is required to use nlplint',
            )
            return
          }

          const conf = vscode.workspace.getConfiguration(EXTENSION_NAME)

          const openAiOrganizationId = conf.get<string>(
            ConfigurationKey.openaiOrganizationId,
          )
          const configuration = new Configuration({
            organization: openAiOrganizationId,
            apiKey: openAIAccessToken,
          })
          const openai = new OpenAIApi(configuration)

          const preferredLanguage =
            conf.get(ConfigurationKey.preferredLanguage) ?? vscode.env.language

          const { prompt: promptFormat, description: promptDescription } =
            await getPrompt()
          const prompt = format(promptFormat, {
            code: text,
            preferredLanguage,
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
              cancelToken: cancelToken.token,
              timeout: 1000 * 60 * 1,
            })

            const result = response.data.choices[0].text

            if (!result) {
              vscode.window.showErrorMessage('No result')
              return
            }

            const match = result.match(OUTPUT_FORMAT_REGEXP)
            if (!match) {
              const doc = await vscode.workspace.openTextDocument({
                content: result,
                language: 'text',
              })
              vscode.window.showTextDocument(doc, {
                viewColumn: vscode.ViewColumn.Beside,
              })
              vscode.window.showErrorMessage(
                "I'm sorry, but the output did not match the expected format, so I was unable to process it correctly. I will output the obtained output as it is.",
              )
              return
            }
            const score = parseFloat(match.groups?.score ?? '')
            const description = (match.groups?.description ?? '')
              .replace(/````$/, '')
              .trim()

            if (Number.isNaN(score)) {
              vscode.window.showErrorMessage('Invalid score')
              return
            }

            const doc = await vscode.workspace.openTextDocument({
              content: `score is ${score} and the reason is\n${description}`,
              language: 'text',
            })
            vscode.window.showTextDocument(doc, {
              viewColumn: vscode.ViewColumn.Beside,
            })
          } catch (err) {
            if (!axios.isAxiosError(err)) {
              if (err instanceof Error) {
                vscode.window.showErrorMessage(err.message)
              } else {
                vscode.window.showErrorMessage('Unknown error occurred.')
              }
            } else {
              const errorMessage = err.response?.data?.error?.message
              vscode.window.showErrorMessage(errorMessage)
            }
          }
        },
      )
    }),
  )
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.setAccessToken`,
      async () => {
        const token = await vscode.window.showInputBox({
          placeHolder: 'Please input your OpenAi access token',
        })
        if (!token) {
          await vscode.window.showWarningMessage(
            'Access token is required to use this extension',
          )
          return
        }
        await context.secrets.store(SecretsKey.openAIAccessToken, token)
        await vscode.window.showInformationMessage(
          'Access token is set successfully',
        )
      },
    ),
  )
}

// This method is called when your extension is deactivated
export function deactivate() {}
