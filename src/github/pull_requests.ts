import {Octokit} from '@octokit/rest'
import {GithubContext} from './contexts'
import {debug, info} from '../logger'
import {
  MAX_NUMBER_ITEMS_PER_PAGE,
  GithubStatusCategories,
  GITHUB_MERGE_STATUS
} from '../constants'
import {inspect} from 'util'
import {GithubTag} from './tags'
import {wait} from '../helpers/wait'

export interface GithubListPR extends Octokit.PullsListResponseItem {}

export interface GithubPR extends Octokit.PullsGetResponse {}

export interface GithubRequest {
  octokit: Octokit
  owner: string
  repo: string
}

const listPRs = async ({
  octokit,
  owner,
  repo
}: GithubRequest): Promise<Octokit.PullsListResponseItem[]> => {
  try {
    debug(`Request list PRs...`)
    const pulls = await octokit.paginate('GET /repos/:owner/:repo/pulls', {
      repo,
      owner,
      per_page: MAX_NUMBER_ITEMS_PER_PAGE,
      state: 'open'
    })
    debug(`Finish request PRs with size: ${pulls.length}`)
    return pulls as Octokit.PullsListResponseItem[]
  } catch (err) {
    throw new Error(`Fail to list PRs page because ${inspect(err)}`)
  }
}

const getPR = async (
  {octokit, owner, repo}: GithubRequest,
  number: number
): Promise<GithubPR> => {
  try {
    debug(`Request PR number ${number}...`)
    const pull = (
      await octokit.pulls.get({
        pull_number: number,
        owner,
        repo
      })
    ).data
    debug(`Finish request PR number ${number}...`)
    return pull
  } catch (err) {
    throw new Error(`Fail to get PR ${number} because ${inspect(err)}`)
  }
}

const getAllOpenPRs = async (
  githubContext: GithubContext
): Promise<GithubPR[]> => {
  const requestData = {
    octokit: githubContext.octokit,
    repo: githubContext.context.repo.repo,
    owner: githubContext.context.repo.owner
  }
  const openPRs = await listPRs(requestData)

  const pullRequestData = openPRs.map(pullRequest =>
    getPR(requestData, pullRequest.number)
  )
  return Promise.all(pullRequestData)
}

export type OpenPRs = {
  // eslint-disable-next-line @typescript-eslint/generic-type-naming
  [key in GithubStatusCategories]: GithubPR[]
}

export async function getOpenPullRequests(
  githubContext: GithubContext,
  retriesCount: number
): Promise<OpenPRs> {
  info(`Fetching open PRs... (retries left ${retriesCount})`)
  try {
    const openPRs = await getAllOpenPRs(githubContext)
    info(`Found ${openPRs.length} open PRs`)

    const prsByState = openPRs.reduce((prs, pr) => {
      debug(`Mapping PR ${pr.number} in mergeable state ${pr.mergeable_state}`)
      const mergeStatus = GITHUB_MERGE_STATUS[pr.mergeable_state]
      debug(`Mapped to merge status ${mergeStatus}`)
      if (!prs[mergeStatus]) prs[mergeStatus] = []
      prs[mergeStatus].push(pr)
      return prs
    }, {} as OpenPRs)

    debug(`PRs by state: ${inspect(prsByState)}`)

    info(
      `Found PRs with the following status: [${prsByState.conflicting?.length ||
        0} with conflicts] [${prsByState.nonConflicting?.length ||
        0} without conflicts] [${prsByState.unknown?.length || 0} unknown]`
    )

    // We need to retry this action because somes PRs are in unknown state that means that mergeability is not calculated yet
    // (because this state is an async call as is explained here https://developer.github.com/v3/git/#checking-mergeability-of-pull-requests)
    if (prsByState.unknown?.length > 0 && retriesCount > 0) {
      await wait(500) // wait some random time giving github time to calculate unknown PRs states
      return getOpenPullRequests(githubContext, retriesCount - 1)
    }

    return prsByState
  } catch (err) {
    debug(inspect(err))
    throw new Error('Fail to get open pull requests')
  }
}

export function hasTag(pr: GithubPR, tag: GithubTag): boolean {
  return pr.labels.map(label => label.id).includes(tag.id)
}

export function addComment(
  githubContext: GithubContext,
  pr: GithubPR,
  comment: string
): Promise<Octokit.GistsCreateCommentResponse> {
  debug(`Attempt to add comment ${comment} for PR: ${pr.number}`)
  const repo = githubContext.context.repo.repo
  const owner = githubContext.context.repo.owner
  return githubContext.octokit.issues
    .createComment({
      owner,
      repo,
      issue_number: pr.number,
      body: comment
    })
    .then(res => {
      debug(`Finish add comment ${comment} for PR: ${pr.number}`)
      return res.data
    })
    .catch(err => {
      debug(`Fail to add comment ${comment} for PR: ${pr.number}`)
      throw err
    })
}

export function addLabel(
  githubContext: GithubContext,
  pr: GithubPR,
  label: string
): Promise<Octokit.IssuesAddLabelsResponse> {
  debug(`Attempt to add label ${label} for PR: ${pr.number}`)
  const repo = githubContext.context.repo.repo
  const owner = githubContext.context.repo.owner
  return githubContext.octokit.issues
    .addLabels({
      owner,
      repo,
      issue_number: pr.number,
      labels: [label]
    })
    .then(res => {
      debug(`Finish add label ${label} for PR: ${pr.number}`)
      return res.data
    })
    .catch(err => {
      debug(`Fail to add label ${label} for PR: ${pr.number}`)
      throw err
    })
}

export function removeLabel(
  githubContext: GithubContext,
  pr: GithubPR,
  label: string
): Promise<Octokit.IssuesRemoveLabelResponse> {
  const repo = githubContext.context.repo.repo
  const owner = githubContext.context.repo.owner
  debug(`Attempt to remove label ${label} for PR: ${pr.number}`)
  return githubContext.octokit.issues
    .removeLabel({
      owner,
      repo,
      issue_number: pr.number,
      name: label
    })
    .then(res => {
      debug(`Finish removing label ${label} for PR: ${pr.number}`)
      return res.data
    })
    .catch(err => {
      debug(`Fail to remove label ${label} for PR: ${pr.number}`)
      throw err
    })
}
