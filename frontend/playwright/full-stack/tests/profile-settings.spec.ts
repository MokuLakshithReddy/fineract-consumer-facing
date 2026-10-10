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

import { expect, loginViaUi, test } from '../support/consumer';
import { expectToast, fill, submitOtp } from '../support/ionic';

test('the profile shows the Fineract client the consumer registered as', async ({
  page,
  signedIn,
}) => {
  await page.goto('/profile');
  await expect(page.getByText(signedIn.displayName).first()).toBeVisible();
  await expect(page.getByText(/Account no\./)).toBeVisible();
  await expect(page.getByText(/Total records:/)).toBeVisible();
});

test('a consumer changes their password with an emailed OTP and signs in with the new one', async ({
  page,
  mailpit,
  signedIn,
}) => {
  const newPassword = 'Changed-in-settings-Passw0rd!';
  await page.goto('/settings');
  await fill(page, 'currentPassword', signedIn.password);
  await fill(page, 'newPassword', newPassword);
  await mailpit.clear(signedIn.email);
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await submitOtp(page, await mailpit.otpFor(signedIn.email));
  await expectToast(page, 'Password changed successfully');

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await loginViaUi(page, mailpit, signedIn.email, newPassword);
});

test('settings list no connected apps for a new consumer', async ({ page, signedIn: _ }) => {
  await page.goto('/settings');
  await expect(page.getByText('No connected apps.')).toBeVisible();
});
