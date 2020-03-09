import {getInputs} from './inputs'
import {error, debug} from './logger'
import getGithubContext from './github/contexts'
import {getOpenPullRequests, hasTag} from './github/pull_requests'
import {getTag} from './github/tags'
import {inspect} from 'util'
import {nonConflictPRs, conflictPRs} from './actions'

async function run(): Promise<void> {
  try {
    const inputs = getInputs()
    const githubContext = getGithubContext(inputs)
    const tag = await getTag(githubContext, inputs.conflictLabel)
    const openPRs = await getOpenPullRequests(
      githubContext,
      inputs.retriesCount
    )

    const taggedPRsWithoutConflicts =
      openPRs.nonConflicting?.filter(pr => hasTag(pr, tag)) || []
    const nonTaggedPRsWithConflicts =
      openPRs.conflicting?.filter(pr => !hasTag(pr, tag)) || []

    debug(
      `PRs without conflicts and with conflict tag: ${inspect(
        taggedPRsWithoutConflicts
      )}`
    )
    debug(
      `PRs with conflicts and without conflict tag: ${inspect(
        nonTaggedPRsWithConflicts
      )}`
    )

    const conflictAction = conflictPRs({
      githubContext,
      prs: nonTaggedPRsWithConflicts,
      label: tag.name
    })

    const nonConflictAction = nonConflictPRs({
      githubContext,
      prs: taggedPRsWithoutConflicts,
      label: tag.name
    })

    await Promise.all([conflictAction, nonConflictAction])
  } catch (err) {
    error(err)
  }
}

run()
