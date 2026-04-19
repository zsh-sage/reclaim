# 🌿 Reclaim Project: Git Branching & Merging Guide

## 1. What is a Branch?

Think of the `main` branch as the **official, stable version** of the Reclaim app. If `main` is broken, the app is broken for our users.

A branch is a **parallel universe**. It allows you to make a copy of the code, experiment, build a new feature, or break things entirely without ever affecting the stable `main` codebase. Once your parallel universe is perfect, we merge it back into `main`.

---

## 2. Naming Your Branches

Just like our commits, branch names should be clean and descriptive. We use a prefix to explain what kind of work is happening:

* **Features:** `feat/your-feature-name` (e.g., `feat/add-postgres-db`)
* **Bug Fixes:** `fix/what-you-are-fixing` (e.g., `fix/login-timeout`)
* **Chores/Docs:** `chore/update-readme` or `docs/api-guide`

---

## 3. The Daily Branching Workflow

Whenever you sit down to start a new task, follow these exact steps:

### Step 1: Always start from the latest `main`
You want to make sure your parallel universe is based on the most up-to-date code.

```bash
# Go to the main branch
git checkout main

# Download the latest code from GitHub
git pull
```

### Step 2: Create your parallel universe
Create your new branch and switch to it. 

```bash
# The -b tells Git to "create AND switch" to the new branch
git checkout -b feat/receipt-scanner
```

### Step 3: Write code and commit safely
Now you are isolated. Write your code, and make your conventional commits just like you learned in the Commit Guide.

```bash
git add .
cz commit
```
*(You can make as many commits as you need on your branch. It is your private workspace!)*

---

## 4. The Merging Checklist (When to Merge)

Do **not** merge your code just because you finished typing. Before a branch is allowed back into `main`, it must pass this checklist:

- [ ] **It is Complete:** The feature actually works as intended.
- [ ] **It is Tested:** You ran the app locally, clicked around, and verified it doesn't crash.
- [ ] **It is Safe:** Your new feature didn't accidentally break an old feature.
- [ ] **It is Clean:** You removed all your `print()` or `console.log()` debugging statements.

---

## 5. How to Merge Back to `main`

Once your code is perfect and passes the checklist, it is time to bring your parallel universe back into the main timeline.

### Step 1: Go back to the stable universe
```bash
git checkout main
```

### Step 2: Pull the parallel universe into main
```bash
# Replace this with your actual branch name
git merge feat/receipt-scanner
```

### Step 3: Clean up (Delete the branch)
You don't need the parallel universe anymore because its code is now safely inside `main`. Deleting old branches keeps your computer clean.

```bash
# The -d tells Git to delete the branch
git branch -d feat/receipt-scanner
```

### Step 4: Push to GitHub
Now that `main` has your awesome new feature, push it to GitHub so the rest of the team can get it!

```bash
git push
```