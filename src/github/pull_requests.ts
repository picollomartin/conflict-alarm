import {Octokit} from '@octokit/rest'
import {GithubContext} from './contexts'
import {debug, info} from '../logger'
import {MAX_NUMBER_PRS_PER_PAGE} from '../constants'
import {inspect} from 'util'

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
    debug(JSON.stringify(pulls))
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

export async function getOpenPullRequests(
  githubContext: GithubContext
): Promise<GithubPR[]> {
  info(`Fetching open PRs...`)
  const openPRs = await getAllOpenPRs(githubContext)
  info(`Found ${openPRs.length} open PRs`)
  return openPRs
}
