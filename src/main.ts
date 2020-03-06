import {getInputs} from './inputs'
import {error} from './logger'
import getGithubContext from './github/contexts'
import {
  getOpenPullRequests,
  hasTag,
  addCommentAndTag,
  deleteTags
} from './github/pull_requests'
import {getTag} from './github/tags'
import {debug} from 'console'

async function run(): Promise<void> {
  try {
    const inputs = getInputs()
    const githubContext = getGithubContext(inputs)
    const tag = await getTag(githubContext, inputs.conflictLabel)
    const openPRs = await getOpenPullRequests(githubContext)

    const taggedPRsWithoutConflicts = openPRs.nonConflicting.filter(pr =>
      hasTag(pr, tag)
    )
    const nonTaggedPRsWithConflicts = openPRs.conflicting.filter(
      pr => !hasTag(pr, tag)
    )

    debug(
      `PRs without conflicts and with conflict tag: ${taggedPRsWithoutConflicts}`
    )
    debug(
      `PRs with conflicts and without conflict tag: ${nonTaggedPRsWithConflicts}`
    )

    await addCommentAndTag(
      githubContext,
      nonTaggedPRsWithConflicts,
      pr =>
        `:boom: Seems like your PR have some issues @${pr.user.login} :boom:`,
      tag.name
    )

    await deleteTags(githubContext, taggedPRsWithoutConflicts, tag.name)
  } catch (err) {
    error(err)
  }
}

run()
