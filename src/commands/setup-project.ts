// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { copyFile } from 'node:fs/promises'
import { join, dirname, relative } from 'node:path'

import prompts from 'prompts'
import { BIN_NAME } from '../constants'

import { log } from '../log'
import {
  Config,
  configPath,
  delay,
  dynamicConfig,
  getLatestProductVersion,
  projectDirectory,
  walkDirectory,
} from '../utils'
import {
  ApplicationTemplateId,
  applicationTemplates,
  getApplicationTemplate,
} from '../application-templates'

// =============================================================================
// User interaction portion

export async function setupProject(): Promise<void> {
  try {
    if (existsSync(configPath)) {
      log.warning('There is already a config file. This will overwrite it!')
      await delay(1000)
    }

    if (configPath.includes('.optional')) {
      log.error(
        'The text ".optional" cannot be in the path to your custom browser'
      )
      process.exit(1)
    }

    // Every new project starts from an application scaffold. The selected
    // scaffold determines both the Gecko product and the project layout.
    const { application } = await prompts({
      type: 'select',
      name: 'application',
      message: 'Select the application to build',
      choices: applicationTemplates.map((template) => ({
        title: template.title,
        description: template.description,
        value: template.id,
      })),
    })

    if (typeof application === 'undefined') return

    const applicationTemplate = getApplicationTemplate(
      application as ApplicationTemplateId
    )
    const applicationTemplateDirectory = join(
      templateDirectory,
      'apps',
      applicationTemplate.id
    )
    const templateConfig = JSON.parse(
      readFileSync(join(applicationTemplateDirectory, 'amelia.json')).toString()
    ) as Config
    const productVersion = await getLatestProductVersion(
      applicationTemplate.product
    )

    const { version, name, appId, vendor, ui, binaryName } = await prompts([
      {
        type: 'text',
        name: 'version',
        message: 'Enter the version of this product',
        initial: productVersion || templateConfig.version.version,
      },
      {
        type: 'text',
        name: 'name',
        message: 'Enter a product name',
        initial: templateConfig.name,
      },
      {
        type: 'text',
        name: 'binaryName',
        message: 'Enter the name of the binary',
        initial: templateConfig.binaryName,
      },
      {
        type: 'text',
        name: 'vendor',
        message: 'Enter a vendor',
        initial: templateConfig.vendor,
      },
      {
        type: 'text',
        name: 'appId',
        message: 'Enter an appid',
        initial: templateConfig.appId,
        // Horrible validation to make sure people don't chose something entirely wrong
        validate: (t: string) => t.includes('.'),
      },
      {
        type: 'select',
        name: 'ui',
        message: 'Select a ui mode template',
        choices:
          applicationTemplate.id === ApplicationTemplateId.Midori
            ? [
                {
                  title: 'None',
                  description:
                    'No UI files will be created beyond the application scaffold',
                  value: 'none',
                },
                {
                  title: 'UserChrome',
                  value: 'uc',
                },
              ]
            : [
                {
                  title: 'None',
                  description:
                    'Thunderbird UI overrides require product-specific patches',
                  value: 'none',
                },
              ],
      },
    ])

    const config: Config = {
      ...templateConfig,
      name,
      vendor,
      appId,
      binaryName,
      version: {
        ...templateConfig.version,
        product: applicationTemplate.product,
        version,
      },
      buildOptions: {
        windowsUseSymbolicLinks: false,
      },
    }

    await copyRequired()
    await copyApplicationTemplate(applicationTemplate.id)

    if (ui === 'uc') {
      await copyOptional(['browser/themes'])
    }

    writeFileSync(configPath, JSON.stringify(config, undefined, 2))
    dynamicConfig.set('brand', Object.keys(config.brands)[0] || 'unofficial')

    // Append important stuff to gitignore
    const gitignore = join(projectDirectory, '.gitignore')
    let gitignoreContents = ''

    if (existsSync(gitignore)) {
      gitignoreContents = readFileSync(gitignore).toString()
    }

    gitignoreContents +=
      '\n.dotbuild/\n.amelia/\nengine/\nfirefox-*/\nnode_modules/\n'

    writeFileSync(gitignore, gitignoreContents)

    log.success(
      'Project setup complete!',
      '',
      `You can start downloading the ${applicationTemplate.title} source code by running |${BIN_NAME} download|`,
      'Or you can follow the getting started guide at https://docs.amelia.dev/getting-started/overview/'
    )
  } catch (error) {
    log.error(error)
  }
}

// =============================================================================
// Filesystem templating

// eslint-disable-next-line unicorn/prefer-module
export const templateDirectory = join(__dirname, '../..', 'template')

/**
 * Copy files from the template directory that have .optional in their path,
 * based on the function parameters
 *
 * @param files The files that should be coppied
 */
async function copyOptional(files: string[]) {
  const directoryContents = await walkDirectory(templateDirectory)
  for (const file of directoryContents) {
    if (shouldSkipOptionalCopy(file, files)) continue

    const outLocation = join(
      projectDirectory,
      file.replace(templateDirectory, '')
    ).replace('.optional', '')

    if (!existsSync(outLocation)) {
      mkdirSync(dirname(outLocation), { recursive: true })
      await copyFile(file, outLocation)
    }
  }
}

/**
 * Used to determine if a file should be copied or not. This is exported only so
 * that it can be unit tested
 *
 * @param file The file that should be copied
 * @param files A list of files / directories that we want to match to
 * @returns If the file should be skipped
 *
 * @private
 */
export function shouldSkipOptionalCopy(file: string, files: string[]): boolean {
  // We want to skip copying this file if:
  // - It is not optional
  // - It is not in the files array
  return (
    !file.includes('.optional') ||
    !files.map((f) => file.includes(f)).some(Boolean)
  )
}

/**
 * Copy all non-optional files from the template directory
 */
async function copyRequired() {
  const directoryContents = await walkDirectory(templateDirectory)

  for (const file of directoryContents) {
    if (file.includes('.optional')) continue
    const relativePath = relative(templateDirectory, file)
    const normalizedPath = relativePath.replace(/\\/g, '/')
    if (
      normalizedPath.startsWith('apps/') ||
      normalizedPath.startsWith('configs/')
    )
      continue
    const outLocation = join(projectDirectory, relativePath)

    if (!existsSync(outLocation)) {
      mkdirSync(dirname(outLocation), { recursive: true })
      await copyFile(file, outLocation)
    }
  }
}

async function copyApplicationTemplate(
  application: ApplicationTemplateId
): Promise<void> {
  const applicationTemplateDirectory = join(
    templateDirectory,
    'apps',
    application
  )
  const directoryContents = await walkDirectory(applicationTemplateDirectory)

  for (const file of directoryContents) {
    const outLocation = join(
      projectDirectory,
      relative(applicationTemplateDirectory, file)
    )

    if (!existsSync(outLocation)) {
      mkdirSync(dirname(outLocation), { recursive: true })
      await copyFile(file, outLocation)
    }
  }
}
