// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import {
  getProductAdapter,
  getProductCandidateSourceUrl,
  getProductReleaseSourceUrl,
  getProductSourceArchiveName,
  getProductSourceRoot,
} from './index'
import { SupportedProducts } from '../utils/config'

describe('Thunderbird product adapter', () => {
  const thunderbird = getProductAdapter(SupportedProducts.Thunderbird)

  it('uses Thunderbird release source paths and a comm readiness marker', () => {
    expect(thunderbird.id).toBe('thunderbird')
    expect(thunderbird.sourceReadyPath).toBe('comm/mail/moz.build')
    expect(thunderbird.mozconfigProject).toBe('comm/mail')
    expect(getProductSourceArchiveName(thunderbird, '155.0')).toBe(
      'thunderbird-155.0.source.tar.xz'
    )
    expect(getProductSourceRoot(thunderbird, '155.0')).toBe('thunderbird-155.0')
    expect(getProductReleaseSourceUrl(thunderbird, '155.0')).toBe(
      'https://archive.mozilla.org/pub/thunderbird/releases/155.0/source/thunderbird-155.0.source.tar.xz'
    )
  })

  it('rejects unsupported candidate source downloads', () => {
    expect(() =>
      getProductCandidateSourceUrl(thunderbird, '155.0b1', 1)
    ).toThrow('Thunderbird candidate sources are not supported')
  })
})

describe('Firefox product adapter', () => {
  it('keeps Firefox candidate source support', () => {
    const firefox = getProductAdapter(SupportedProducts.Firefox)
    expect(getProductCandidateSourceUrl(firefox, '155.0', 2)).toBe(
      'https://archive.mozilla.org/pub/firefox/candidates/155.0-candidates/build2/source/firefox-155.0.source.tar.xz'
    )
  })
})
