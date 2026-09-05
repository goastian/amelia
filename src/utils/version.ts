// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
import axios from 'axios'
import { log } from '../log'
import { SupportedProducts } from './config'
import { config } from '..'
import { dynamicConfig } from '.'
import { getProductAdapter } from '../products'

export const shouldUseCandidate = (): boolean => {
  const adapter = getProductAdapter(config.version.product)
  const brandingKey = dynamicConfig.get('brand')
  return (
    adapter.supportsCandidates &&
    brandingKey !== 'release' &&
    config.version.candidate !== undefined &&
    config.version.version !== config.version.candidate
  )
}

export const getSourceVersionOrCandidate = () => {
  return shouldUseCandidate()
    ? config.version.candidate
    : config.version.version
}

export const getLatestProductVersion = async (
  product: SupportedProducts = SupportedProducts.Firefox
): Promise<string> => {
  const adapter = getProductAdapter(product)
  const versionKey = adapter.productDetailsKeys[product]

  if (!versionKey) {
    throw new Error(`No version metadata key is configured for '${product}'`)
  }

  try {
    const { data } = await axios.get(adapter.productDetailsUrl)

    return data[versionKey]
  } catch (error) {
    log.warning(`Failed to get the latest ${adapter.displayName} version:`)
    log.error(error)

    return ''
  }
}

// Compatibility exports for integrations that still import the Firefox-named
// helpers. They now dispatch from version.product and also work for Thunderbird.
export const getFFVersionOrCandidate = getSourceVersionOrCandidate
export const getLatestFF = getLatestProductVersion
