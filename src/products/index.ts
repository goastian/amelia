// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import { SupportedProducts } from '../utils/config'

export type ProductId = 'firefox' | 'thunderbird'

export interface ProductAdapter {
  id: ProductId
  displayName: string
  supportedProducts: SupportedProducts[]
  productDetailsUrl: string
  productDetailsKeys: Partial<Record<SupportedProducts, string>>
  supportsCandidates: boolean
  sourceArchivePrefix: string
  sourceRootPrefix: string
  sourceReadyPath: string
  versionFiles: string[]
  brandingRoot: string
  fallbackBranding: string
  mozconfigProject: string
  sourceVersionEnvironment: string
  supportsMultiLocalePackaging: boolean
  supportsManagedUpdates: boolean
}

const firefox: ProductAdapter = {
  id: 'firefox',
  displayName: 'Firefox',
  supportedProducts: [
    SupportedProducts.Firefox,
    SupportedProducts.FirefoxESR,
    SupportedProducts.FirefoxDevelopment,
    SupportedProducts.FirefoxBeta,
    SupportedProducts.FirefoxNightly,
  ],
  productDetailsUrl:
    'https://product-details.mozilla.org/1.0/firefox_versions.json',
  productDetailsKeys: {
    [SupportedProducts.Firefox]: 'LATEST_FIREFOX_VERSION',
    [SupportedProducts.FirefoxBeta]: 'LATEST_FIREFOX_DEVEL_VERSION',
    [SupportedProducts.FirefoxDevelopment]: 'FIREFOX_DEVEDITION',
    [SupportedProducts.FirefoxESR]: 'FIREFOX_ESR',
    [SupportedProducts.FirefoxNightly]: 'FIREFOX_NIGHTLY',
  },
  supportsCandidates: true,
  sourceArchivePrefix: 'firefox',
  sourceRootPrefix: 'firefox',
  sourceReadyPath: 'toolkit/moz.build',
  versionFiles: ['browser/config/version.txt'],
  brandingRoot: 'browser/branding',
  fallbackBranding: 'unofficial',
  mozconfigProject: 'browser',
  sourceVersionEnvironment: 'MIDORI_FIREFOX_VERSION',
  supportsMultiLocalePackaging: true,
  supportsManagedUpdates: true,
}

const thunderbird: ProductAdapter = {
  id: 'thunderbird',
  displayName: 'Thunderbird',
  supportedProducts: [
    SupportedProducts.Thunderbird,
    SupportedProducts.ThunderbirdESR,
  ],
  productDetailsUrl:
    'https://product-details.mozilla.org/1.0/thunderbird_versions.json',
  productDetailsKeys: {
    [SupportedProducts.Thunderbird]: 'LATEST_THUNDERBIRD_VERSION',
    [SupportedProducts.ThunderbirdESR]: 'THUNDERBIRD_ESR',
  },
  supportsCandidates: false,
  sourceArchivePrefix: 'thunderbird',
  sourceRootPrefix: 'thunderbird',
  sourceReadyPath: 'comm/mail/moz.build',
  versionFiles: [
    'comm/mail/config/version.txt',
    'comm/mail/config/version_display.txt',
  ],
  brandingRoot: 'comm/mail/branding',
  fallbackBranding: 'nightly',
  mozconfigProject: 'comm/mail',
  sourceVersionEnvironment: 'AMELIA_THUNDERBIRD_VERSION',
  supportsMultiLocalePackaging: false,
  supportsManagedUpdates: false,
}

const adapters = [firefox, thunderbird]

export function getProductAdapter(product: SupportedProducts): ProductAdapter {
  const adapter = adapters.find((entry) =>
    entry.supportedProducts.includes(product)
  )

  if (!adapter) {
    throw new Error(`No product adapter is registered for '${product}'`)
  }

  return adapter
}

export function getProductSourceArchiveName(
  adapter: ProductAdapter,
  version: string
): string {
  return `${adapter.sourceArchivePrefix}-${version}.source.tar.xz`
}

export function getProductSourceRoot(
  adapter: ProductAdapter,
  version: string
): string {
  return `${adapter.sourceRootPrefix}-${version}`
}

export function getProductReleaseSourceUrl(
  adapter: ProductAdapter,
  version: string
): string {
  const archive = getProductSourceArchiveName(adapter, version)
  return `https://archive.mozilla.org/pub/${adapter.id}/releases/${version}/source/${archive}`
}

export function getProductCandidateSourceUrl(
  adapter: ProductAdapter,
  version: string,
  build: number
): string {
  if (!adapter.supportsCandidates) {
    throw new Error(
      `${adapter.displayName} candidate sources are not supported`
    )
  }

  const archive = getProductSourceArchiveName(adapter, version)
  return `https://archive.mozilla.org/pub/${adapter.id}/candidates/${version}-candidates/build${build}/source/${archive}`
}
