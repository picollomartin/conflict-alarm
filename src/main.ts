import {getInputs} from './inputs'
import {error} from './logger'
import getGithubContext from './github/contexts'
import {getOpenPullRequests} from './github/pull_requests'

async function run(): Promise<void> {
  try {
    const inputs = getInputs()
    const githubContext = getGithubContext(inputs)
    await getOpenPullRequests(githubContext, inputs)
  } catch (err) {
    error(err)
  }
}

run()
