import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  RESTORE_FAILURE_MESSAGE,
  RESTORE_NONE_MESSAGE,
  RESTORE_SUCCESS_MESSAGE,
  restoreAlertMessage,
  restoreAlertTitle,
} from '../src/services/billing/restore-messages';

describe('restore messages', () => {
  it('uses Apple ID wording for no entitlement', () => {
    assert.equal(restoreAlertMessage(false), RESTORE_NONE_MESSAGE);
    assert.match(RESTORE_NONE_MESSAGE, /Apple ID/);
  });

  it('uses success copy for active entitlement', () => {
    assert.equal(restoreAlertMessage(true), RESTORE_SUCCESS_MESSAGE);
    assert.equal(restoreAlertTitle(true), 'Restored');
  });

  it('uses friendly failure copy', () => {
    assert.match(RESTORE_FAILURE_MESSAGE, /try again/i);
  });
});
