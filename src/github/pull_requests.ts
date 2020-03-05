import {Octokit} from '@octokit/rest'
import {GithubContext} from './contexts'
import {debug, info} from '../logger'
import {Inputs} from '../inputs'
import {MAX_NUMBER_PRS_PER_PAGE} from '../constants'
import {inspect} from 'util'

export interface GithubListPR extends Octokit.PullsListResponseItem {}

export interface GithubPR extends Octokit.PullsGetResponse {}

export interface GithubRequest {
  octokit: Octokit
  owner: string
  repo: string
}

const listPRs = async (
  {octokit, owner, repo}: GithubRequest,
  page: number
): Promise<Octokit.Response<Octokit.PullsListResponse>> => {
  try {
    debug(`Request page ${page} of PRs...`)
    const pulls = await octokit.pulls.list({
      repo,
      owner,
      per_page: MAX_NUMBER_PRS_PER_PAGE,
      state: 'open',
      page
    })
    debug(`Finish request page ${page} of PRs with size: ${pulls.data.length}`)
    return pulls
  } catch (err) {
    throw new Error(`Fail to list PRs page ${page} because ${inspect(err)}`)
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
  githubContext: GithubContext,
  maxLimitPRs: number
): Promise<GithubPR[]> => {
  const requestData = {
    octokit: githubContext.octokit,
    repo: githubContext.context.repo.repo,
    owner: githubContext.context.repo.owner
  }
  const requestsBatches = Math.ceil(maxLimitPRs / MAX_NUMBER_PRS_PER_PAGE)
  const requests = []

  for (let i = 0; i < requestsBatches; i++) {
    requests.push(listPRs(requestData, i))
  }

  return Promise.all(requests).then(requestsData => {
    const pullRequests = requestsData.flatMap(request => request.data)
    const pullRequestsData = pullRequests.map(pullRequest =>
      getPR(requestData, pullRequest.number)
    )
    return Promise.all(pullRequestsData)
  })
}

export async function getOpenPullRequests(
  githubContext: GithubContext,
  {maxLimitPRs}: Inputs
): Promise<GithubPR[]> {
  info(`Fetching Open PRs...`)
  const openPRs = await getAllOpenPRs(githubContext, maxLimitPRs)
  info(`Found ${openPRs.length} open PRs`)
  return openPRs
}
