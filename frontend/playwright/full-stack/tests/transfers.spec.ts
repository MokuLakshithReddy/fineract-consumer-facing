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

import { OPENING_DEPOSIT, addBeneficiaryViaUi, expect, seedPayee, test } from '../support/consumer';
import { action, expectToast, fill, select, submitOtp } from '../support/ionic';

test.describe('transfers', () => {
  test('a consumer moves money between their own accounts with an emailed OTP', async ({
    page,
    fineract,
    mailpit,
    signedIn,
  }) => {
    await page.goto('/transfers');
    await action(page, 'Transfer Money').click();
    await expect(page).toHaveURL(/\/transfers\/new$/);

    await select(page, 'fromAccountId', new RegExp(signedIn.savings.accountNo));
    await select(page, 'toDestination', new RegExp(signedIn.secondSavings.accountNo));
    await fill(page, 'amount', 250);
    await mailpit.clear(signedIn.email);
    await page.getByRole('button', { name: 'Send transfer' }).click();
    await submitOtp(page, await mailpit.otpFor(signedIn.email));

    await expect(page.getByText('Transfer complete.')).toBeVisible();
    await expect
      .poll(() => fineract.savingsBalance(signedIn.savings.id))
      .toBe(OPENING_DEPOSIT - 250);
    await expect.poll(() => fineract.savingsBalance(signedIn.secondSavings.id)).toBe(250);

    await action(page, 'Back to transfers').click();
    await expect(page.locator('tr', { hasText: '250.00 USD' }).first()).toBeVisible();
  });

  test('a consumer pays a beneficiary within its limit, and is stopped above it', async ({
    page,
    fineract,
    mailpit,
    signedIn,
  }) => {
    const payee = await seedPayee(fineract);
    await addBeneficiaryViaUi(page, mailpit, signedIn, {
      name: 'Electricity',
      officeName: payee.officeName,
      accountNumber: payee.savings.accountNo,
      transferLimit: 300,
    });

    await page.goto('/transfers/new');
    await select(page, 'fromAccountId', new RegExp(signedIn.savings.accountNo));
    await select(page, 'toDestination', 'Electricity');
    await fill(page, 'amount', 120);
    await mailpit.clear(signedIn.email);
    await page.getByRole('button', { name: 'Send transfer' }).click();
    await submitOtp(page, await mailpit.otpFor(signedIn.email));
    await expect(page.getByText('Transfer complete.')).toBeVisible();
    await expect.poll(() => fineract.savingsBalance(payee.savings.id)).toBe(120);

    await page.goto('/transfers/new');
    await select(page, 'fromAccountId', new RegExp(signedIn.savings.accountNo));
    await select(page, 'toDestination', 'Electricity');
    await fill(page, 'amount', 301);
    await page.getByRole('button', { name: 'Send transfer' }).click();
    await expectToast(page, 'That amount is over the transfer limit set for this beneficiary.');
    await expect.poll(() => fineract.savingsBalance(payee.savings.id)).toBe(120);
  });
});
