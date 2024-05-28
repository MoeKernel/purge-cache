import * as github from '@actions/github';
import * as core from '@actions/core';

function setFailedWrongValue(input: string, value: string) {
  core.setFailed(`Wrong value for the input '${input}': ${value}`);
}

enum Inputs {
  Debug = "debug",
  MaxAge = "max-age",
  Accessed = "accessed",
  Token = "token",
  CacheKey = "cache_key"
}

async function run() {
  const debug = core.getInput(Inputs.Debug, { required: false }) === 'true';
  const maxAge = core.getInput(Inputs.MaxAge, { required: true });
  const maxDate = new Date(Date.now() - Number.parseInt(maxAge) * 1000);
  if (maxDate === null) {
    setFailedWrongValue(Inputs.MaxAge, maxAge);
  }
  const token = core.getInput(Inputs.Token, { required: true });
  const cacheKey = core.getInput(Inputs.CacheKey, { required: false });
  const octokit = github.getOctokit(token);

  interface Cache {
    id?: number | undefined;
    key?: string | undefined;
  }

  const results: Cache[] = [];

  for (let i = 1; i <= 100; i += 1) {
    const { data: cachesRequest } = await octokit.rest.actions.getActionsCacheList({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      per_page: 100,
      page: i
    });

    if (cachesRequest.actions_caches.length === 0) {
      break;
    }

    results.push(...cachesRequest.actions_caches);
  }

  if (debug) {
    console.log(`Found ${results.length} caches`);
  }

  if (cacheKey) {
    const cacheToDelete = results.find(cache => cache.key === cacheKey);

    if (cacheToDelete && cacheToDelete.id !== undefined) {
      try {
        await octokit.rest.actions.deleteActionsCacheById({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          cache_id: cacheToDelete.id!,
        });
        core.info(`Cache with key ${cacheKey} deleted successfully.`);
      } catch (error) {
        core.setFailed(`Failed to delete cache ${cacheKey};\n\n${error}`);
      }
    } else {
      core.warning(`No cache found with key ${cacheKey}.`);
    }
  } else if (debug) {
    console.log('No cache key specified. Skipping cache deletion.');
  }
}

run();

