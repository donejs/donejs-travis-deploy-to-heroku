# Contributing to donejs-travis-deploy-to-heroku

## Developing Locally

This section will walk you through setting up the [repository](https://github.com//donejs-travis-deploy-to-heroku) on your computer.

### Signing up for GitHub

If you don’t already have a GitHub account, you’ll need to [create a new one](https://help.github.com/articles/signing-up-for-a-new-github-account/).

### Forking & cloning the repository

A “fork” is a copy of a repository in your personal GitHub account. “Cloning” is the process of getting the repository’s source code on your computer.

GitHub has a guide for [forking a repo](https://help.github.com/articles/fork-a-repo/). To fork donejs-travis-deploy-to-heroku, you can start by going to its [fork page](https://github.com//donejs-travis-deploy-to-heroku/fork).

Next, you’ll want to clone the repo. [GitHub’s cloning guide](https://help.github.com/articles/cloning-a-repository/) explains how to do this on Linux, Mac, or Windows.

GitHub’s guide will [instruct you](https://help.github.com/articles/fork-a-repo/#step-2-create-a-local-clone-of-your-fork) to clone it with a command like:

```shell
git clone https://github.com/YOUR-USERNAME/donejs-travis-deploy-to-heroku
```

Make sure you replace `YOUR-USERNAME` with your GitHub username.

### Installing the dependencies

After you’ve forked & cloned the repository, you’ll need to install the project’s dependencies.

First, make sure you’ve [installed Node.js and npm](https://docs.npmjs.com/getting-started/installing-node).

If you just cloned the repo from the command line, you’ll want to switch to the folder with your clone:

```shell
cd donejs-travis-deploy-to-heroku
```

Next, install the project’s dependencies with npm:

```shell
npm install
```

### Running the tests

Firefox is used to run the repository’s automated tests from the command line. If you don’t already have it, [download Firefox](https://www.mozilla.org/en-US/firefox/new/). Mozilla has guides for installing it on [Linux](https://support.mozilla.org/t5/Install-and-Update/Install-Firefox-on-Linux/ta-p/2516), [Mac](https://support.mozilla.org/t5/Install-and-Update/How-to-download-and-install-Firefox-on-Mac/ta-p/3453), and [Windows](https://support.mozilla.org/t5/Install-and-Update/How-to-download-and-install-Firefox-on-Windows/ta-p/2210).

After Firefox is installed, you can run:

```shell
npm test
```
