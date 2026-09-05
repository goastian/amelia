import execa from 'execa'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { bin_name } from '../..'
import { BASH_PATH, ENGINE_DIR, MELON_TMP_DIR } from '../../constants'
import { log } from '../../log'
import { commandExistsSync } from '../../utils/command-exists'
import { downloadFileToLocation } from '../../utils/download'
import { ensureDirectory, windowsPathToUnix } from '../../utils/fs'
import { init } from '../init'
import { config } from '../..'
import {
  addAddonsToMozBuild,
  downloadAddon,
  generateAddonMozBuild,
  getAddons,
  initializeAddon,
  resolveAddonDownloadUrl,
  unpackAddon,
} from './addon'
import { configPath, shouldUseCandidate } from '../../utils'
import fs from 'fs-extra'
import {
  getProductAdapter,
  getProductCandidateSourceUrl,
  getProductReleaseSourceUrl,
  getProductSourceArchiveName,
  getProductSourceRoot,
  ProductAdapter,
} from '../../products'

export function shouldSetupSource() {
  const product = getProductAdapter(config.version.product)
  return !(
    existsSync(ENGINE_DIR) &&
    existsSync(resolve(ENGINE_DIR, product.sourceReadyPath))
  )
}

// Kept for external callers that imported the old API.
export const shouldSetupFirefoxSource = shouldSetupSource

export async function setupProductSource(
  version: string,
  candidateBuild: number,
  isCandidate = false
) {
  const product = getProductAdapter(config.version.product)
  const sourceTar = await downloadProductSource(
    product,
    version,
    candidateBuild,
    isCandidate
  )

  await unpackProductSource(sourceTar, product, version)

  if (!process.env.CI_SKIP_INIT) {
    log.info(`Initialising ${product.displayName}`)
    await init(ENGINE_DIR)
  }
}

export const setupFirefoxSource = setupProductSource

export async function unpackProductSource(
  name: string,
  product: ProductAdapter,
  version: string
): Promise<void> {
  log.info(`Unpacking ${product.displayName}...`)

  ensureDirectory(ENGINE_DIR)
  let tarExec = 'tar'

  // On MacOS, we need to use gnu tar, otherwise tar doesn't behave how we
  // would expect it to behave, so this section is responsible for handling
  // that
  //
  // If BSD tar adds --transform support in the future, we can use that
  // instead
  if (process.platform == 'darwin') {
    // GNU Tar doesn't come preinstalled on any MacOS machines, so we need to
    // check for it and ask for the user to install it if necessary
    if (!commandExistsSync('gtar')) {
      throw new Error(
        `GNU Tar is required to extract ${product.displayName}'s source on MacOS. Please install it using the command |brew install gnu-tar| or |sudo port install gnutar| and try again`
      )
    }

    tarExec = 'gtar'
  }

  log.info(`Unpacking ${resolve(MELON_TMP_DIR, name)} to ${ENGINE_DIR}`)
  if (process.platform === 'win32') {
    log.info(`Unpacking ${product.displayName} source on Windows (7z)`)
    await execa('7z', [
      'x',
      resolve(MELON_TMP_DIR, name),
      '-o' + resolve(MELON_TMP_DIR, name.replace('.tar.xz', '.tar')),
    ])
    log.info('Unpacking Firefox source again without the .xz extension')
    await execa('7z', [
      'x',
      resolve(MELON_TMP_DIR, name.replace('.tar.xz', '.tar')),
      '-o' + MELON_TMP_DIR,
    ])
    const archiveDir = resolve(
      MELON_TMP_DIR,
      getProductSourceRoot(product, version)
    )
    if (existsSync(ENGINE_DIR)) {
      // remove the existing engine directory
      fs.removeSync(ENGINE_DIR)
    }
    log.info(`Moving ${product.displayName} source to engine directory`)
    fs.moveSync(archiveDir, ENGINE_DIR)
    return
  }

  await execa(
    tarExec,
    [
      '--strip-components=1',
      '-xf',
      resolve(MELON_TMP_DIR, name),
      '-C',
      ENGINE_DIR,
    ].filter(Boolean) as string[],
    {
      shell: BASH_PATH,
    }
  )
  const readyPath = resolve(ENGINE_DIR, product.sourceReadyPath)
  if (!existsSync(readyPath)) {
    log.error(
      `The extracted source is not a ${product.displayName} checkout: '${product.sourceReadyPath}' is missing.`
    )
  }

  log.info(`Unpacked ${product.displayName} source to ${ENGINE_DIR}`)
}

export async function downloadProductSource(
  product: ProductAdapter,
  version: string,
  candidateBuild: number,
  isCandidate = false
) {
  const filename = getProductSourceArchiveName(product, version)

  const fsParent = MELON_TMP_DIR
  const fsSaveLocation = resolve(fsParent, filename)

  log.info(`Locating ${product.displayName} release ${version}...`)

  await ensureDirectory(dirname(fsSaveLocation))

  if (existsSync(fsSaveLocation)) {
    log.info('Using cached download')
    return filename
  }

  // Do not re-download if there is already an existing workspace present
  if (existsSync(ENGINE_DIR))
    log.error(
      `Workspace already exists.\nRemove that workspace and run |${bin_name} download ${version}| again.`
    )

  log.info(`Downloading ${product.displayName} release ${version}...`)

  // Try to download the second build first, as it is more likely to be the
  // correct build
  const url = isCandidate
    ? getProductCandidateSourceUrl(product, version, candidateBuild)
    : getProductReleaseSourceUrl(product, version)
  await downloadFileToLocation(url, resolve(MELON_TMP_DIR, filename))
  return filename
}

export async function downloadInternals({
  version,
  force,
  isCandidate = shouldUseCandidate(),
}: {
  version: string
  force?: boolean
  isCandidate?: boolean
}) {
  const product = getProductAdapter(config.version.product)

  // Provide a legible error if there is no version specified
  if (!version) {
    log.error(
      `You have not specified a ${product.displayName} version in your config file. This is required to build a ${product.displayName} application.`
    )
    process.exit(1)
  }

  let candidateBuild = 1
  if (isCandidate) {
    if (!product.supportsCandidates) {
      log.error(
        `${product.displayName} candidate source downloads are not supported.`
      )
    }
    version = config.version.candidate as string
    candidateBuild = config.version.candidateBuild as number
  }

  if (force && existsSync(ENGINE_DIR)) {
    log.info('Removing existing workspace')
    rmSync(ENGINE_DIR, { recursive: true })
  }

  // If the engine directory is empty, we should delete it.
  const engineIsEmpty =
    existsSync(ENGINE_DIR) &&
    (await readdir(ENGINE_DIR).then((files) => files.length === 0))
  if (engineIsEmpty) {
    log.info("'engine/' is empty, it...")
    rmSync(ENGINE_DIR, { recursive: true })
  }

  if (!existsSync(ENGINE_DIR)) {
    await setupProductSource(version, candidateBuild, isCandidate)
  } else if (shouldSetupSource()) {
    log.error(
      `The existing engine directory is not a ${product.displayName} source tree. Run |${bin_name} download --force| to replace it.`
    )
  }

  if (product.id == 'firefox') {
    for (const addon of getAddons()) {
      const downloadUrl = await resolveAddonDownloadUrl(addon)
      const downloadedXPI = await downloadAddon(downloadUrl, addon)

      await unpackAddon(downloadedXPI, addon)
      await generateAddonMozBuild(addon)
      await initializeAddon(addon)
    }

    await addAddonsToMozBuild(getAddons())
  } else {
    for (const addon of getAddons()) {
      const downloadUrl = await resolveAddonDownloadUrl(addon)
      await downloadAddon(downloadUrl, addon)
    }
  }

  if (!isCandidate) {
    config.version.version = version
  } else {
    config.version.candidate = version
  }
  writeFileSync(configPath, JSON.stringify(config, undefined, 2))
}
