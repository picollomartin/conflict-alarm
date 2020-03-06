import {Octokit} from '@octokit/rest'
import {GithubContext} from './contexts'
import {debug} from '../logger'
import {inspect} from 'util'

export interface GithubTag extends Octokit.IssuesGetLabelResponse {}

export async function getTag(
  githubContext: GithubContext,
  tagName: string
): Promise<GithubTag> {
  debug(`Fetching tag with name [${tagName}]...`)
  const owner = githubContext.context.repo.owner
  const repo = githubContext.context.repo.repo
  return githubContext.octokit.issues
    .getLabel({name: tagName, owner, repo})
    .then(response => {
      debug(`Tag found with data [${inspect(response)}]...`)
      return response.data
    })
    .catch(err => {
      debug(inspect(err))
      throw new Error(`Fail to get tag with name [${tagName}]`)
    })
}
