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
import { action, fill, ionInput, select, submitOtp } from '../support/ionic';

const today = () => new Date().toISOString().slice(0, 10);

test.describe('loans', () => {
  test('a consumer previews a schedule, submits a loan application and withdraws the draft', async ({
    page,
    fineract,
    signedIn: _,
  }) => {
    await page.goto('/loans');
    await action(page, 'Apply for a loan').click();
    await expect(page).toHaveURL(/\/loans\/apply$/);

    await select(page, 'productId', /^E2E-LOAN-/);
    // Choosing a product reloads the loan template, which prefills the terms from the product
    // (10,000 over 5 repayments). Wait for it, or it overwrites what is typed next.
    await expect(ionInput(page, 'principal')).toHaveValue('10000');
    await expect(ionInput(page, 'numberOfRepayments')).toHaveValue('5');
    await fill(page, 'principal', 2000);
    await fill(page, 'numberOfRepayments', 4);
    await fill(page, 'repaymentEvery', 1);
    await fill(page, 'loanTermFrequency', 4);
    await fill(page, 'interestRatePerPeriod', 2);
    await fill(page, 'expectedDisbursementDate', today());
    await fill(page, 'submittedOnDate', today());

    await page.getByRole('button', { name: 'Preview schedule' }).click();
    await expect(page.getByText('Repayment Schedule')).toBeVisible();
    await expect(page.getByText(/Total repayment expected:/)).toBeVisible();

    await page.getByRole('button', { name: 'Submit application' }).click();
    const draft = page.locator('ion-card', { hasText: /Draft Application #\d+/ });
    await expect(draft).toBeVisible();
    const loanId = Number(/#(\d+)/.exec((await draft.textContent()) ?? '')![1]);
    expect(await fineract.loanStatus(loanId)).toBe('loanStatusType.submitted.and.pending.approval');

    await draft.getByRole('button', { name: 'Withdraw draft' }).click();
    await expect(draft).toHaveCount(0);
    await expect.poll(() => fineract.loanStatus(loanId)).toBe('loanStatusType.withdrawn.by.client');
  });

  test('a consumer repays a loan from savings with an emailed OTP', async ({
    page,
    fineract,
    mailpit,
    signedIn,
  }) => {
    const outstanding = await fineract.loanOutstanding(signedIn.loan.id);
    await page.goto(`/loans/${signedIn.loan.id}`);
    await action(page, 'Make a payment').click();
    await expect(page).toHaveURL(new RegExp(`/loans/${signedIn.loan.id}/repay$`));

    await select(page, 'fromAccountId', new RegExp(signedIn.savings.accountNo));
    await fill(page, 'amount', 100);
    await mailpit.clear(signedIn.email);
    await page.getByRole('button', { name: 'Make payment' }).click();
    await submitOtp(page, await mailpit.otpFor(signedIn.email));

    await expect(page.getByText('Payment complete.')).toBeVisible();
    await expect
      .poll(() => fineract.loanOutstanding(signedIn.loan.id))
      .toBeCloseTo(outstanding - 100, 2);
  });
});
