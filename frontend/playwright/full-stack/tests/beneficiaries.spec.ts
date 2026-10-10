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

import { addBeneficiaryViaUi, expect, seedPayee, test } from '../support/consumer';
import { expectToast, fill, submitOtp } from '../support/ionic';

test('a consumer adds, renames and deletes a beneficiary, confirming changes with an emailed OTP', async ({
  page,
  fineract,
  mailpit,
  signedIn,
}) => {
  const payee = await seedPayee(fineract);
  await addBeneficiaryViaUi(page, mailpit, signedIn, {
    name: 'Landlord',
    officeName: payee.officeName,
    accountNumber: payee.savings.accountNo,
    transferLimit: 1000,
  });
  const row = page.locator('tr', { hasText: 'Landlord' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('1,000');

  await row.getByRole('button', { name: 'Edit Beneficiary' }).click();
  await fill(page, 'name', 'Landlord (flat 4)');
  await fill(page, 'transferLimit', 1500);
  await mailpit.clear(signedIn.email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await submitOtp(page, await mailpit.otpFor(signedIn.email));
  await expectToast(page, 'Beneficiary updated.');
  const renamed = page.locator('tr', { hasText: 'Landlord (flat 4)' });
  await expect(renamed).toContainText('1,500');

  await renamed.getByRole('button', { name: 'Delete' }).click();
  await expectToast(page, 'Beneficiary deleted.');
  await expect(page.getByText('No beneficiaries yet.')).toBeVisible();
});

test('a consumer cannot add one of their own accounts as a beneficiary', async ({
  page,
  signedIn,
}) => {
  await page.goto('/beneficiaries');
  await page.getByRole('button', { name: 'Add beneficiary' }).click();
  await fill(page, 'name', 'Myself');
  await fill(page, 'officeName', signedIn.officeName);
  await fill(page, 'accountNumber', signedIn.secondSavings.accountNo);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expectToast(page, "You can't add one of your own accounts as a beneficiary.");
});
