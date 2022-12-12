import { createHash } from 'crypto'

export const hash = (str: string): string => {
  const md5 = createHash('md5')
  return md5.update(str, 'binary').digest('hex')
}
