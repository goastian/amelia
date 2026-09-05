// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { createWriteStream } from 'node:fs'

import axios from 'axios'
import cliProgress from 'cli-progress'
import { Duplex } from 'node:stream'
import { log } from '../log'

export async function downloadFileToLocation(
  url: string,
  writeOutPath: string,
  consoleWriter?: (message: string) => void
): Promise<void> {
  return new Promise((resolve, reject) =>
    (async () => {
      try {
        const { data, headers } = await axios.get(url, {
          responseType: 'stream',
        })

        const length = headers['content-length']
        const writer = createWriteStream(writeOutPath)
        let receivedBytes = 0
        let settled = false

        const progressBar = new cliProgress.SingleBar({
          stream: consoleWriter
            ? new Duplex({
                write: (chunk, encoding, next) => {
                  consoleWriter(chunk.toString())
                  next()
                },
                read: () => {
                  /* Empty output */
                },
              })
            : process.stdout,
        })
        progressBar.start(length as any, receivedBytes)

        const progressInterval = setInterval(
          () => progressBar.update(receivedBytes),
          500
        )
        const fail = (error: unknown) => {
          if (settled) return
          settled = true
          clearInterval(progressInterval)
          progressBar.stop()
          log.warning(`An error occurred whilst downloading ${url}.`)
          reject(error)
        }

        data.on('data', (chunk: { length: number }) => {
          receivedBytes += chunk.length
        })
        data.on('error', fail)
        writer.on('error', fail)
        writer.on('finish', () => {
          if (settled) return
          settled = true
          clearInterval(progressInterval)
          progressBar.stop()
          resolve()
        })
        data.pipe(writer)
      } catch (error) {
        reject(error)
      }
    })()
  )
}
