import {inspect} from 'util'

import {GithubContext} from './github/contexts'
import {
  GithubPR,
  removeLabel,
  addComment,
  addLabel
} from './github/pull_requests'
import {debug, info} from './logger'
import {
  NON_CONFLICT_MEMES_COUNT,
  CONFLICT_MEMES_COUNT,
  MEME_URL
} from './constants'

export interface ActionTrigger {
  githubContext: GithubContext
  prs: GithubPR[]
  label: string
}

enum MemeTypes {
  CONFLICTS = 'conflicts',
  NON_CONFLICTS = 'non_conflicts'
}

const random = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1) + min)

const getRandomMemeLink = (type: MemeTypes): string => {
  debug(`Generating meme ${type}...`)
  const memeCount: number =
    type === MemeTypes.CONFLICTS
      ? NON_CONFLICT_MEMES_COUNT
      : CONFLICT_MEMES_COUNT

  const randomNumber = random(1, memeCount)
  const url = `![Meme](${MEME_URL}/${type}/meme_${randomNumber}.jpg?raw=true)`
  debug(`Meme ${type} generated with url ${url}`)
  return url
}

export async function nonConflictPRs({
  prs,
  githubContext,
  label
}: ActionTrigger): Promise<void> {
  info(`Attempt to remove tags from non conflict PRs...`)
  const commentGenerator = (pr: GithubPR): string =>
    `:tada: Seems like your PR is ok now @${
      pr.user.login
    } :tada: \n ${getRandomMemeLink(MemeTypes.NON_CONFLICTS)}`
  try {
    await Promise.all(
      prs.map(pr =>
        Promise.all([
          removeLabel(githubContext, pr, label),
          addComment(githubContext, pr, commentGenerator(pr))
        ])
      )
    )
  } catch (err) {
    debug(inspect(err))
    throw new Error('Fail to remove comments and tags')
  }
}

export async function conflictPRs({
  prs,
  githubContext,
  label
}: ActionTrigger): Promise<void> {
  info(`Attempt to tag and comment conflict PRs...`)
  try {
    const commentGenerator = (pr: GithubPR): string =>
      `:boom: Seems like your PR have some merge conflicts @${
        pr.user.login
      } :boom: \n ${getRandomMemeLink(MemeTypes.CONFLICTS)}`
    await Promise.all(
      prs.map(pr =>
        Promise.all([
          addComment(githubContext, pr, commentGenerator(pr)),
          addLabel(githubContext, pr, label)
        ])
      )
    )
  } catch (err) {
    debug(inspect(err))
    throw new Error('Fail to add comments and tags')
  }
}
