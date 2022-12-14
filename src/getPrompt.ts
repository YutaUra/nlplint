import axios from 'axios'

const SAMPLE_PROMPT_ENDPOINT =
  'https://us-central1-nlplint.cloudfunctions.net/samplePrompt'

export const getPrompt = async () => {
  const { data } = await axios.get<{ prompt: string; description: string }>(
    SAMPLE_PROMPT_ENDPOINT,
  )
  return data
}
