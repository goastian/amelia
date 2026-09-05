// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { Command } from 'commander'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { bin_name } from '..'
import { log } from '../log'
import { config, configDispatch } from '../utils'
import { getProductAdapter } from '../products'

export const init = async (directory: Command | string): Promise<void> => {
  const cwd = process.cwd()
  const product = getProductAdapter(config.version.product)

  const absoluteInitDirectory = resolve(cwd as string, directory.toString())

  if (!existsSync(absoluteInitDirectory)) {
    log.error(
      `Directory "${directory}" not found.\nCheck the directory exists and run |${bin_name} init| again.`
    )
  }

  const sourceDirectory = resolve(cwd, directory.toString())
  const versionFile = product.versionFiles
    .map((path) =>
      resolve(
        sourceDirectory,
        path.replace('version.txt', 'version_display.txt')
      )
    )
    .find((path) => existsSync(path))

  const resolvedVersionFile =
    versionFile ??
    log.error(
      `Unable to determine the ${
        product.displayName
      } source version. Expected one of: ${product.versionFiles.join(', ')}`
    )

  let version = readFileSync(resolvedVersionFile).toString()

  if (!version)
    log.error(
      `Directory "${directory}" is not a valid ${product.displayName} source tree.\nCheck the directory exists and run |${bin_name} init| again.`
    )

  version = version.trim().replace(/\\n/g, '')

  // TODO: Use bash on windows, this may significantly improve performance.
  // Still needs testing though
  log.info('Initializing git, this may take some time')
  const lightweightInit = process.env.AMELIA_LIGHTWEIGHT_INIT === '1'

  await configDispatch('git', {
    args: ['init'],
    cwd: absoluteInitDirectory,
    killOnError: true,
  })

  await configDispatch('git', {
    args: ['checkout', '--orphan', version],
    cwd: absoluteInitDirectory,
    killOnError: true,
  })

  await configDispatch('git', {
    args: ['config', 'commit.gpgsign', 'false'],
    cwd: absoluteInitDirectory,
    killOnError: true,
  })

  await configDispatch('git', {
    args: ['config', 'core.safecrlf', 'false'],
    cwd: absoluteInitDirectory,
    killOnError: true,
  })

  if (lightweightInit) {
    log.warning(
      'Using a lightweight source commit. Git reset cannot restore source files until the project is re-initialised without AMELIA_LIGHTWEIGHT_INIT=1.'
    )
  } else {
    await configDispatch('git', {
      args: ['add', '-f', '.'],
      cwd: absoluteInitDirectory,
      killOnError: true,
    })
  }

  log.info('Committing...')

  await configDispatch('git', {
    args: lightweightInit
      ? ['commit', '--allow-empty', '-m', `${product.displayName} ${version}`]
      : ['commit', '-m', `${product.displayName} ${version}`],
    cwd: absoluteInitDirectory,
    // Committing can fail for configuration issues: see https://github.com/goastian/amelia/issues/1877
    killOnError: true,
  })

  if (!lightweightInit) {
    await configDispatch('git', {
      args: ['checkout', '-b', config.name.toLowerCase().replace(/\s/g, '_')],
      cwd: absoluteInitDirectory,
      killOnError: true,
    })
  }
}
