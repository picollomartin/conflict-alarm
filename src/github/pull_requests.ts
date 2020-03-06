import {Octokit} from '@octokit/rest'
import {GithubContext} from './contexts'
import {debug, info} from '../logger'
import {
  MAX_NUMBER_PRS_PER_PAGE,
  GithubStatusCategories,
  GITHUB_MERGE_STATUS
} from '../constants'
import {inspect} from 'util'
import {GithubTag} from './tags'

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
      per_page: MAX_NUMBER_PRS_PER_PAGE,
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
  githubContext: GithubContext
): Promise<OpenPRs> {
  info(`Fetching open PRs...`)
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

    return prsByState
  } catch (err) {
    debug(inspect(err))
    throw new Error('Fail to get open pull requests')
  }
}

export function hasTag(pr: GithubPR, tag: GithubTag): boolean {
  return pr.labels.map(label => label.id).includes(tag.id)
}

export async function addCommentAndTag(
  githubContext: GithubContext,
  prs: GithubPR[],
  generateComment: (pr: GithubPR) => string,
  label: string
): Promise<void> {
  info(`Attempt to tag and comment conflict PRs...`)
  const repo = githubContext.context.repo.repo
  const owner = githubContext.context.repo.owner
  try {
    await Promise.all(
      prs.map(pr =>
        githubContext.octokit.issues.createComment({
          owner,
          repo,
          issue_number: pr.number,
          body: generateComment(pr)
        })
      )
    )

    await Promise.all(
      prs.map(pr =>
        githubContext.octokit.issues.addLabels({
          owner,
          repo,
          issue_number: pr.number,
          labels: [label]
        })
      )
    )
  } catch (err) {
    debug(inspect(err))
    throw new Error('Fail to add comments and tags')
  }
}

export async function deleteTags(
  githubContext: GithubContext,
  prs: GithubPR[],
  label: string
): Promise<void> {
  info(`Attempt to remove tags from non conflict PRs...`)
  const repo = githubContext.context.repo.repo
  const owner = githubContext.context.repo.owner
  try {
    await Promise.all(
      prs.map(pr =>
        githubContext.octokit.issues.removeLabel({
          owner,
          repo,
          issue_number: pr.number,
          name: label
        })
      )
    )
  } catch (err) {
    debug(inspect(err))
    throw new Error('Fail to remove comments and tags')
  }
}
