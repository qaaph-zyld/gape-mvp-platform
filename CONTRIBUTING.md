# Contributing to GAPE MVP Platform

First off, thank you for considering contributing to GAPE MVP Platform! It's people like you that make it such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* Use a clear and descriptive title
* Describe the exact steps which reproduce the problem
* Provide specific examples to demonstrate the steps
* Describe the behavior you observed after following the steps
* Explain which behavior you expected to see instead and why
* Include screenshots and animated GIFs if possible

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* Use a clear and descriptive title
* Provide a step-by-step description of the suggested enhancement
* Provide specific examples to demonstrate the steps
* Describe the current behavior and explain which behavior you expected to see instead
* Explain why this enhancement would be useful

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Include screenshots and animated GIFs in your pull request whenever possible
* Follow the JavaScript/React styleguides
* Include thoughtfully-worded, well-structured tests
* Document new code
* End all files with a newline

## Development Process

1. Fork the repo
2. Create a new branch from `develop`:
   ```bash
   git checkout develop
   git checkout -b feature/my-feature
   ```
3. Make your changes
4. Write or adapt tests as needed
5. Update documentation as needed
6. Push to your fork and submit a pull request

### Branch Naming Convention

* Feature branches: `feature/description`
* Bug fix branches: `fix/description`
* Documentation branches: `docs/description`
* Release branches: `release/version`

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

* `feat:` new feature
* `fix:` bug fix
* `docs:` documentation only changes
* `style:` code style changes (formatting, missing semi colons, etc)
* `refactor:` code change that neither fixes a bug nor adds a feature
* `perf:` code change that improves performance
* `test:` adding missing tests
* `chore:` changes to the build process or auxiliary tools

## Style Guides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

### JavaScript Style Guide

* Use ES6+ features
* Use meaningful variable names
* Add comments for complex logic
* Follow ESLint rules

### Documentation Style Guide

* Use Markdown
* Reference functions and classes in backticks
* Include code examples where appropriate
* Keep documentation up to date with code changes

## Additional Notes

### Issue and Pull Request Labels

* `bug`: Something isn't working
* `enhancement`: New feature or request
* `documentation`: Documentation only changes
* `good first issue`: Good for newcomers
* `help wanted`: Extra attention is needed
* `invalid`: Something's wrong
* `question`: Further information is requested
* `wontfix`: This will not be worked on
