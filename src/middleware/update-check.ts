// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import { bin_name, config } from '..'
import { log } from '../log'
import { getLatestProductVersion } from '../utils'
import { getProductAdapter } from '../products'

export const updateCheck = async (): Promise<void> => {
  const product = getProductAdapter(config.version.product)
  const productVersion = config.version.version

  try {
    const version = await getLatestProductVersion(config.version.product)

    if (productVersion && version !== productVersion)
      log.warning(
        `Latest version of ${product.displayName} (${version}) does not match frozen version (${productVersion}). Update it with the command |${bin_name} update|.`
      )
  } catch (error) {
    log.warning(`Failed to check for updates.`)
    log.askForReport()
    //log.error(error)
  }
}
