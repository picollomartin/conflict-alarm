import {getInputs} from './inputs'
import {error} from './logger'
import getGithubContext from './github/contexts'
import {getOpenPullRequests} from './github/pull_requests'
import {getTag} from './github/tags'

async function run(): Promise<void> {
  try {
    const inputs = getInputs()
    const githubContext = getGithubContext(inputs)
    await getTag(githubContext, inputs.conflictLabel)
    await getOpenPullRequests(githubContext)
  } catch (err) {
    error(err)
  }
}

run()
