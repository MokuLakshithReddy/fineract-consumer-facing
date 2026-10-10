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

import { OPENING_DEPOSIT, expect, test } from '../support/consumer';
import { action } from '../support/ionic';

test.describe('accounts', () => {
  test('the summary lists the savings and loan accounts staff opened in Fineract', async ({
    page,
    signedIn,
  }) => {
    const savingsCard = page.locator('ion-card', {
      has: page.getByRole('heading', { name: 'Savings' }),
    });
    await expect(savingsCard).toContainText('2 accounts');
    await expect(savingsCard).toContainText(signedIn.savings.accountNo);
    await expect(savingsCard).toContainText(signedIn.secondSavings.accountNo);

    const loansCard = page.locator('ion-card', {
      has: page.getByRole('heading', { name: 'Loans' }),
    });
    await expect(loansCard).toContainText('1 accounts');
    await expect(loansCard).toContainText(signedIn.loan.accountNo);
  });

  test('a savings account shows its balance and the opening deposit as a transaction', async ({
    page,
    signedIn,
  }) => {
    await page
      .getByRole('link', { name: /Savings/ })
      .first()
      .click();
    await page.goto('/savings');
    await page.locator('tr.clickable', { hasText: signedIn.savings.accountNo }).click();
    await expect(page).toHaveURL(new RegExp(`/savings/${signedIn.savings.id}$`));
    await expect(
      page.getByText(`Balance: $${OPENING_DEPOSIT.toLocaleString('en-US')}.00`),
    ).toBeVisible();

    const deposit = page.locator('tr.clickable', { hasText: 'Deposit' }).first();
    await expect(deposit).toBeVisible();
    await deposit.click();
    await expect(page).toHaveURL(new RegExp(`/savings/${signedIn.savings.id}/transactions/\\d+$`));
    await expect(page.getByText('Type: Deposit')).toBeVisible();
    await action(page, 'Back to account').click();
    await expect(page).toHaveURL(new RegExp(`/savings/${signedIn.savings.id}$`));
  });

  test('a loan shows what was disbursed and what is outstanding', async ({ page, signedIn }) => {
    await page.goto('/loans');
    await page.locator('tr.clickable', { hasText: signedIn.loan.accountNo }).click();
    await expect(page).toHaveURL(new RegExp(`/loans/${signedIn.loan.id}$`));
    await expect(page.getByRole('heading', { name: 'Loan Account' })).toBeVisible();
    await expect(page.getByText('Principal disbursed:')).toContainText('$10,000.00');
    await expect(page.getByText('Total outstanding:')).toBeVisible();
    await expect(page.locator('tr.clickable', { hasText: 'Disbursement' }).first()).toBeVisible();
  });
});
