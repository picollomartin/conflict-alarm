import * as github from '@actions/github'
import {Context} from '@actions/github/lib/context'
import {debug} from '../logger'
import {Inputs} from '../inputs'

export interface GithubContext {
  octokit: github.GitHub
  context: Context
}

export default function getGithubContext({githubToken}: Inputs): GithubContext {
  debug('Attempt to get github context...')
  const octokit = new github.GitHub(githubToken)
  return {octokit, context: github.context}
}
