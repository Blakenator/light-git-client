import {
  PreCommitStatus,
  PreCommitStatusModel,
  NotificationModel,
} from '@light-git/shared';

// =============================================================================
// Pre-commit Status Detector
// Ported from: src/app/services/warning-listeners/pre-commit-status.listener.ts
// =============================================================================

const PRECOMMIT_REGEX =
  /^(.+?)\.{2}\.*(\(.+?\)\s*)?(Failed|Passed|Skipped)/gim;

/**
 * Parses git command error output for pre-commit hook results.
 * Returns a PreCommitStatusModel if hook output is detected, otherwise null.
 */
export function detectPreCommitStatus(
  errorOutput: string,
): PreCommitStatusModel | null {
  const matches = [...errorOutput.matchAll(PRECOMMIT_REGEX)];
  if (matches.length === 0) return null;

  const note = errorOutput.substring(0, matches[0].index);
  const rules = matches.map((match, i) => {
    const [, name, skipReason, status] = match;
    const passed = status !== PreCommitStatus.Failed;
    return {
      name,
      status: status as PreCommitStatus,
      error: passed
        ? skipReason
        : errorOutput.substring(
            match.index + match[0].length,
            matches[i + 1]?.index,
          ),
    };
  });

  return new PreCommitStatusModel(rules, note);
}

// =============================================================================
// Remote Message Detector
// Ported from: src/app/services/warning-listeners/remote-message.listener.ts
// =============================================================================

const REMOTE_MESSAGE_REGEX = /^(\s*remote:(\s+.*?\r?\n?)?)+$/im;

/**
 * Detects "remote:" server messages in git push/commit error output.
 * These are informational messages from the server (e.g. PR creation URLs).
 * Always non-error: the operation should be treated as successful.
 */
export function detectRemoteMessage(
  errorOutput: string,
): NotificationModel | null {
  // Preprocess: collapse trailing blank lines
  const processed = errorOutput.replace(/\r?\n\s*(\r?\n|$)/g, '');
  const match = processed.match(REMOTE_MESSAGE_REGEX);
  if (!match) return null;

  return new NotificationModel(
    'Message from Remote',
    processed.replace(/remote:\s+/g, ''),
  );
}

// =============================================================================
// CRLF Warning Detector
// Ported from: src/app/services/warning-listeners/crlf.listener.ts
// =============================================================================

const CRLF_REGEX =
  /^(warning:\s+((CR)?LF)\s+will\s+be\s+replaced\s+by\s+((CR)?LF)\s+in\s+(.+?)(\r?\nThe\s+file\s+will\s+have\s+its\s+original.+?\r?\n?)?)+$/i;

/**
 * Detects CRLF line-ending warnings in git error output.
 * Returns the start and end line-ending types, or null if not detected.
 * Always non-error: the operation should be treated as successful.
 */
export function detectCrlfWarning(
  errorOutput: string,
): { start: string; end: string } | null {
  const match = errorOutput.match(CRLF_REGEX);
  if (!match) return null;

  return { start: match[2], end: match[4] };
}

// =============================================================================
// Submodule Checkout Detector
// Ported from: src/app/services/warning-listeners/submodule-checkout.listener.ts
// =============================================================================

const SUBMODULE_CHECKOUT_REGEX =
  /\*?\s*Submodule\s+path\s+'.*?':\s+checked\s+out\r?\n?/i;

/**
 * Detects submodule checkout messages in git checkout/pull error output.
 * These are informational and the operation should be treated as successful.
 */
export function detectSubmoduleCheckout(errorOutput: string): boolean {
  return SUBMODULE_CHECKOUT_REGEX.test(errorOutput);
}
