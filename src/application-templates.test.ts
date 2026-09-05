// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ApplicationTemplateId,
  applicationTemplates,
  getApplicationTemplate,
} from './application-templates'

describe('application templates', () => {
  it('offers Midori on Firefox and Astian Suite on Thunderbird', () => {
    expect(getApplicationTemplate(ApplicationTemplateId.Midori).product).toBe(
      'firefox'
    )
    expect(
      getApplicationTemplate(ApplicationTemplateId.AstianSuite).product
    ).toBe('thunderbird')
  })

  it.each(applicationTemplates)('ships the $id project layout', (template) => {
    const root = join(process.cwd(), 'template', 'apps', template.id)

    for (const requiredPath of [
      'amelia.json',
      'src',
      'scripts',
      'patches',
      'configs',
      'build',
      '.github',
    ]) {
      expect(existsSync(join(root, requiredPath))).toBe(true)
    }

    const config = JSON.parse(
      readFileSync(join(root, 'amelia.json'), 'utf8')
    ) as { version: { product: string } }
    expect(config.version.product).toBe(template.product)
  })

  it('uses comm/mail in the Astian Suite mozconfig', () => {
    const mozconfig = readFileSync(
      join(
        process.cwd(),
        'template',
        'apps',
        ApplicationTemplateId.AstianSuite,
        'configs',
        'common',
        'mozconfig'
      ),
      'utf8'
    )

    expect(mozconfig).toContain('ac_add_options --enable-project=comm/mail')
    expect(mozconfig).not.toContain('--enable-application=browser')
  })
})
