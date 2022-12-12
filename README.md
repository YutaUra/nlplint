# nlplint

## Features

- command `nlplint: Lint` to lint the text in the active editor
- command `nlplint: Set OpenAI Access Token` to set the OpenAI access token

<!-- Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow. -->

## Requirements

An OpenAI access token is required to use this extension.

https://beta.openai.com/account/api-keys

Generate an access token from this page and save it via the `nlplint: Set OpenAI Access Token` command.
Note: The access token is stored in the vscode's SecretStrage.

At this time, there is a free extension available, but please check the OpenAI page for more information about the fee. (The extension itself is free of charge, but there may be a fee for using OpenAI's API.)

## Extension Settings


* `nlplint.openaiOrganizationId`: OpenAI Organization ID. This is optional.
* `nlplint.preferredLanguage`: Language used by the natural language processing model to explain
* `nlplint.telemetry`: Enable Telemetry. Note: Data will be used for research purposes. Please keep it turned on.

## Known Issues

This extension is based on OpenAI's natural language processing model. In other words, please note that there is no guarantee as to the correctness of the text presented by this extension.

If you have any problems, please feel free to submit an issue.
https://github.com/YutaUra/nlplint/issues

## Release Notes

### 0.0.3

Fixed to use random prompts 

### 0.0.2

Add README

### 0.0.1

First release

The following features will be released
- Allow users to get answers in their preferred language
- Present scores in SRP principles

---

## For more information

* [GitHub Repository](https://github.com/YutaUra/nlplint)
