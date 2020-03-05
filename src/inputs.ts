import * as core from '@actions/core'
import {DEFAULT_CONFLICT_LABEL} from './constants'
import {debug, info} from './logger'

export interface Inputs {
  githubToken: string
  conflictLabel: string
}

export function getInputs(): Inputs {
  debug('Attempt to get user inputs...')
  const githubToken = core.getInput('githubToken', {required: true})
  const conflictLabel = core.getInput('conflictLabel') || DEFAULT_CONFLICT_LABEL
  info(`Inputs for action: label -> [${conflictLabel}]`)
  return {githubToken, conflictLabel}
}
