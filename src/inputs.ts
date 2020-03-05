import * as core from '@actions/core'
import {DEFAULT_CONFLICT_LABEL, MAX_LIMIT_PRS} from './constants'
import {debug, info} from './logger'

export interface Inputs {
  githubToken: string
  conflictLabel: string

  maxLimitPRs: number
}

export function getInputs(): Inputs {
  debug('Attempt to get user inputs...')
  const githubToken = core.getInput('githubToken', {required: true})
  const conflictLabel = core.getInput('conflictLabel') || DEFAULT_CONFLICT_LABEL
  const maxLimitPRs = Math.max(
    Number(core.getInput('maxLimitPRs')) || 0,
    MAX_LIMIT_PRS
  )
  info(
    `Inputs for action: label -> [${conflictLabel}], maxLimitPRs -> [${maxLimitPRs}]`
  )
  return {githubToken, conflictLabel, maxLimitPRs}
}
