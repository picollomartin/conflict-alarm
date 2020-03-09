export const DEFAULT_CONFLICT_LABEL = 'conflicts'

export const DEFAULT_RETRIES_COUNT = 3

export enum GithubStatusCategories {
  'conflicting' = 'conflicting',
  'unknown' = 'unknown',
  'nonConflicting' = 'nonConflicting'
}

export interface GithubMergeStatus {
  [key: string]: GithubStatusCategories
}

export const GITHUB_MERGE_STATUS: GithubMergeStatus = {
  dirty: GithubStatusCategories.conflicting,
  unknown: GithubStatusCategories.unknown,
  blocked: GithubStatusCategories.nonConflicting,
  behind: GithubStatusCategories.nonConflicting,
  unstable: GithubStatusCategories.nonConflicting,
  has_hooks: GithubStatusCategories.nonConflicting,
  clean: GithubStatusCategories.nonConflicting
}

export const MAX_NUMBER_ITEMS_PER_PAGE = 100

export const CONFLICT_MEMES_COUNT = 7

export const NON_CONFLICT_MEMES_COUNT = 7

export const MEME_URL =
  'https://github.com/picollomartin/conflict-alarm/blob/master/src/images'
