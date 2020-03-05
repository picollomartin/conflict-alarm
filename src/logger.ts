import * as core from '@actions/core'

export function debug(message: string): void {
  core.debug(message)
}

export function info(message: string): void {
  core.info(message)
}

export function warn(message: string): void {
  core.warning(message)
}

export function output(name: string, message: string): void {
  core.setOutput(name, message)
}

export function error(err: Error): void {
  debug(err.message)
  core.setFailed(err.message)
}
