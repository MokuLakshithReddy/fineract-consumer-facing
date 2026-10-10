/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { expect, test } from '../support/consumer';
import { expectToast } from '../support/ionic';

test('the audit trail records the sign-in, and access to another customer’s account is refused', async ({
  page,
  signedIn: _,
}) => {
  await page.goto('/demo');
  const audit = page.locator('ion-card', { hasText: 'Audit Activity' });
  await expect(audit.locator('tbody tr').first()).toBeVisible();
  await expect(audit).toContainText('LOGIN_SUCCESS');

  await page.getByRole('button', { name: 'Try a forbidden savings account' }).click();
  await expectToast(
    page,
    /You don't have access to this savings account\.|We couldn't find that savings account\./,
  );
});

test('the shell navigates between features and switches language', async ({
  page,
  signedIn: _,
}) => {
  for (const [item, heading] of [
    ['Savings', 'Savings Accounts'],
    ['Loans', 'Loan Accounts'],
    ['Transfers', 'Transfer History'],
    ['Beneficiaries', 'Beneficiaries'],
    ['Summary', 'Account Summary'],
  ]) {
    await page.locator('ion-menu ion-item', { hasText: item }).first().click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Change language' }).click();
  await page.locator('ion-popover ion-item', { hasText: 'हिन्दी' }).click();
  await expect(page.getByRole('heading', { name: 'Account Summary' })).toHaveCount(0);
  await page.getByRole('button', { name: /Change language|भाषा/ }).click();
  await page.locator('ion-popover ion-item', { hasText: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Account Summary' })).toBeVisible();
});
