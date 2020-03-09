import * as core from '@actions/core'
import {DEFAULT_CONFLICT_LABEL, DEFAULT_RETRIES_COUNT} from './constants'
import {debug, info} from './logger'

export interface Inputs {
  githubToken: string
  conflictLabel: string
  retriesCount: number
}

export function getInputs(): Inputs {
  debug('Attempt to get user inputs...')
  const githubToken = core.getInput('githubToken', {required: true})
  const conflictLabel = core.getInput('conflictLabel') || DEFAULT_CONFLICT_LABEL
  const retriesCount = Number(
    core.getInput('retriesCount') || DEFAULT_RETRIES_COUNT
  )
  info(
    `Inputs for action: label -> [${conflictLabel}], retriesCount -> [${retriesCount}]`
  )
  return {githubToken, conflictLabel, retriesCount}
}
