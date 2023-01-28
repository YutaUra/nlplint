import axios from 'axios'

const SAMPLE_PROMPT_ENDPOINT =
  'https://us-central1-nlplint.cloudfunctions.net/samplePrompt'

export const getPrompt = async () => {
  const { data } = await axios.get<{ prompt: string; description: string }>(
    SAMPLE_PROMPT_ENDPOINT,
  )
  return data
}

export const OUTPUT_FORMAT_REGEXP =
  /\s*score: *(?<score>(?:[1-9]+\d*(?:\.\d*)?|0(?:\.0)?))\n\s*description: *(?<description>(?:.|\n)*)/
