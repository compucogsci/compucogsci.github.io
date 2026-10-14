const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_CONFIG_PATH = path.join(REPO_ROOT, 'config', 'treehouse.yaml');

/**
 * Load config/treehouse.yaml and apply non-empty overrides
 * (from workflow_dispatch inputs or CLI flags).
 */
function loadConfig(configPath = DEFAULT_CONFIG_PATH, overrides = {}) {
  const config = YAML.parse(fs.readFileSync(configPath, 'utf8'));

  if (overrides.pickupTime) config.pickup_time = overrides.pickupTime;
  if (overrides.costLimitUsd !== undefined && overrides.costLimitUsd !== '') {
    const limit = Number(overrides.costLimitUsd);
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new Error(`Invalid cost limit override: ${overrides.costLimitUsd}`);
    }
    config.cost_limit_usd = limit;
  }
  if (overrides.searchWindowDays) config.search_window_days = Number(overrides.searchWindowDays);

  if (!/^\d{2}:\d{2}$/.test(config.pickup_time)) {
    throw new Error(`pickup_time must be HH:MM, got: ${config.pickup_time}`);
  }
  return config;
}

module.exports = { REPO_ROOT, DEFAULT_CONFIG_PATH, loadConfig };
