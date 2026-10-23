# Contributing

When contributing to this repository, please first discuss the change you wish to make via /issue with team members before making a change.

## Commit Messages

Write clear commit message for easier reviews and bug fixing. One commit should contains only a specific change (by the following types below), and **commit often**

Try follow these conventional commit format:

<pre>type(scope): description</pre>

### Types

- `feat` : Add or Remove new feature
- `fix` : Fix bug of `feat` commits
- `refactor` : Restructure the code, doesn't change code's behaviour
- `perf` : special `refactor` commit, that improve performance
- `style` : white-space, formatting, missing indent/semi-colon etc.
- `docs` : Documentation commits
- `test` : Adding or fixing tests, snapshots included
- `chore` : Miscellaneous commits (e.g. modifying `.gitignore`)
- `(scope)`: Scope of the commit (optional): `web`, `api`, `shared`, `scripts`, `snapshots`

No AI attribution in a commit or a pull request: no `Co-Authored-By` line for an assistant, no "Generated with" line.

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

- `feat/short-name` for a feature
- `fix/short-description` for a bug fix
- `docs/`, `refactor/` or `test/` when that is the whole branch, the same words as the commit types

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
    - Add Suggestion ![the suggestion button](docs/images/github-suggestion-button.png) to suggest a commit to the code
4. After finish reviewing changes, select `Review Changes`
    - If the code **needs correction or changes**, select `Request changes`
      and write your suggestion
    - If the code **has no issues**, select `Approve` (put `LGTM` (Looks Good To Me) in the comment for confirming your approval (optional))
5. `Submit review` to approve merging

#### Cleaning Branch

After PR successfully merged, select `Delete branch` to clean branch history

## Before You Push

Node 22 or newer. Then, from the repository root:

```
npm run verify
```

It runs Prettier, ESLint, the TypeScript check and the unit tests for both
apps, the same as CI. `npm test` runs only the tests, and `npm run build` the
production build (CI runs that too).

- **Accounts to sign in with:** `npm run db:seed -w api` creates the
  `snapshot_` provider, receiver and admin accounts, and the same three as
  `demo_`, whose provider and receiver share one project in every status. It
  touches only rows named `snapshot_` or `demo_`, and rebuilds the demo
  projects on every run.
- **If you changed an API response,** run `bash scripts/snapshot-api.sh` with
  the API running, then `git diff snapshots/`, and commit what changed with a
  line on why. Do not commit while the script runs: the pre-commit hook moves
  files under it.

## Database

One shared Supabase database. There is no local database on your machine.

- **Never** run `prisma migrate dev`. It deletes columns that are missing from your branch's schema.
- **Never** add or change columns in the Supabase web UI.
- **Never** run `npm run db:pull`. It rewrites `schema.prisma` from the database, which strips every comment and drops relation options such as `onDelete: Restrict`.
- All `npm run db:*` commands run from the repo root.

### After You Pull

```
npm run db:generate -w apps/api
```

Every time. Skip it and TypeScript keeps using the old types with no error.

### Changing the Schema

1. Edit `apps/api/prisma/schema.prisma`

2. Generate the migration. Fill in `YYYYMMDDHHMM_short_name` yourself — for example `202609071400_cert_image_required`:

    ```
    cd apps/api
    npx prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script --output prisma/migrations/YYYYMMDDHHMM_short_name/migration.sql
    ```

3. Open the file it wrote and read the SQL. If you see any `DROP`, or you made a column required, **stop and ask the team**.

4. Commit the schema and the migration file together. Open a PR.

5. After approval:

    ```
    npm run db:migrate -w apps/api
    npm run db:generate -w apps/api
    ```

6. Tell the team. Everyone who pulls runs `npm run db:generate -w apps/api`. They do not run the migration.
