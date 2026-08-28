# Contributing

When contributing to this repository, please first discuss the change you wish to make via /issue with team members before making a change.

Please note we have a code of conduct, please follow it in all your interactions with the project.

## Commit Messages

Write clear commit message for easier reviews and bug fixing. One commit should contains only a specific change (by the following types below), and **commit often**

Try follow these conventional commit format:

<pre>type(scope): description</pre>

### Types

- `feat` : Add or Remove new feature
- `fix` : Fix bug of `feat` commits
- `refactor` : Restructure the code, doesn't change code's behaviour
- `perf` : special `refactor` commit, that improve performance
- `style` : white-space, formatiing, missing indent/semi-colon etc.
- `docs` : Documentation commits
- `chore` : Miscellaneous commits (e.g. modifying `.gitignore`)
- `(scope)`: Scope of the commit (optional)

## Git Workflow

Main branch is only for **production-ready code**. Each **feature** or **fix** should be done in seperate branch.

### Pull Regularly (Important)

Keep your local repo stay in sync with remote repo whenever you make changes related to `main` branch

#### Pull the Latest `main` Branch

```
git checkout main
git pull origin main
```

### Branch

Create new branch to work on a specific task (e.g. new feature, bug fix)

#### Branch Naming

Try using this naming convention

- `feature/feature-name`
- `bugfix/bug-description`

#### Create Branch

Only create branch from `main` branch for less complexity

```
git checkout -b 'branch_name'
```

<sup>`git checkout main` & `git pull origin main` to make sure `main` is in sync</sup>

#### Keep Branch in Sync

While working on a branch, pull main (merge) to your branch so it is in sync with current `main`, in case there is a change in `main`.

1. In GitHub Desktop, select branch `main` -> `fetch origin` -> `pull origin`
2. Checkout to your branch (select your branch instead of `main`)
3. `branch>Update from main`
4. If a conflict occurs, resolve the conflict (guide below)

#### Merge Conflicts

Merge Conflict can occur on both **merging** and **pulling**. When there are changes that `main` and `branch` doesn't match and git doesn't know which line to keep, it throws a **Merge Conflict**

##### <ins>How to resolve</ins>

- check on file(s) that conflict (`Open in VS Code` in GitHub Desktop)

<pre><<<<<<< HEAD
//Your changes (current branch)
console.log('Hello from my branch');
======================================
//Conflcts (main branch)
console.log('Hello from main branch');
>>>>>>> main</pre>

- choose one side to keep (or combine them if necessary)
- delete the conflict marker (<<<<, ====, >>>>)

<pre>console.log('Resolved Merge Conflict..')</pre>

- saves all your conflict files then continue merge in GitHub Desktop

#### Push your branch

Push your branch to `main` regularly, so that other members can see your changes and reduce merge conflict occuring

```
git push origin 'branch name'
```

### PR Process

After pushing the branch to remote repo, to merge seperate branch back to `main`, Create a **Pull Request (PR)**.

#### Create PR

1. Navigate to `Pull requests` and select `New pull request`
2. Select `base:main <- compare:branch`
3. If therer is no conflict, you should be able to `Create pull request`
4. Write your branch title (branch topic) and details for clarification and `Create pull request`
5. Pull request must be reviewed and `approved` by at least `1` members, in order to merge into `main`
    - `Merge pull request` : All commits from this branch will be added to main branch (for branch with short commits and no conflicts commit)
    - `Squash and merge` : All commits from this branch will be combined into one commit into the main branch (for branch with long commits or conflicts commit)
        - Rewrite new commit message for all commits (add description if needed)
6. `Confirm` your PR after being approved to merge branch to `main`

#### Review PR

1. Navigate to `Pull requests` and select open pull request
2. Select `Files changed`
3. Review and Check changes.
    - Leaves comment if there is/are any notice by pointing at that line of code and click the `+` sign
    - Add Suggestion ![alt text](image.png) to suggest a commit to the code
4. After finish reviewing changes, select `Review Changes`
    - If the code **needs correction or changes**, select `Request changes`
      and write your suggestion
    - If the code **has no issues**, select `Approve` (put `LGTM` (Looks Good To Me) in the comment for confirming your approval (optional))
5. `Submit review` to approve merging

#### Cleaning Branch

After PR successfully merged, select `Delete branch` to clean branch history
