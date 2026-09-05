// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

import { SupportedProducts } from './utils/config'

export enum ApplicationTemplateId {
  Midori = 'midori',
  AstianSuite = 'astian-suite',
}

export interface ApplicationTemplate {
  id: ApplicationTemplateId
  title: string
  description: string
  product: SupportedProducts
}

export const applicationTemplates: ApplicationTemplate[] = [
  {
    id: ApplicationTemplateId.Midori,
    title: 'Midori Browser',
    description: 'Browser application based on Firefox and Gecko',
    product: SupportedProducts.Firefox,
  },
  {
    id: ApplicationTemplateId.AstianSuite,
    title: 'Astian Suite',
    description: 'Mail application based on Thunderbird and Gecko',
    product: SupportedProducts.Thunderbird,
  },
]

export function getApplicationTemplate(
  id: ApplicationTemplateId
): ApplicationTemplate {
  const template = applicationTemplates.find((entry) => entry.id === id)

  if (!template) {
    throw new Error(`Unknown application template '${id}'`)
  }

  return template
}
