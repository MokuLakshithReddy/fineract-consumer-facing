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
import { loginViaUi } from '../support/consumer';
import { expectToast, fill, submitOtp } from '../support/ionic';

test.describe('registration and multi-factor sign-in', () => {
  test('a consumer registers with an emailed OTP, signs in with a second factor, and signs out', async ({
    page,
    mailpit,
    registered,
  }) => {
    // Registration finished on the success screen. An ion-button with routerLink renders as a link.
    await page.getByRole('link', { name: 'Continue to sign in' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await mailpit.clear(registered.email);
    await fill(page, 'email', registered.email);
    await fill(page, 'password', registered.password);
    await page.getByRole('button', { name: 'Continue' }).click();

    // The password alone does not open a session: the BFF emails a second factor.
    const otp = page.locator('app-otp');
    await expect(otp).toBeVisible();
    await expect(otp).toContainText('Enter the verification code sent to');
    await fill(otp, 'otp', await mailpit.otpFor(registered.email));
    await otp.getByRole('button', { name: 'Verify' }).click();

    await expect(page).toHaveURL(/\/summary$/);
    await expect(page.getByRole('heading', { name: 'Account Summary' })).toBeVisible();

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/summary');
    await expect(page).toHaveURL(/\/login/);
  });

  test('a wrong password and a wrong second factor are both refused', async ({
    page,
    mailpit,
    registered,
  }) => {
    await page.goto('/login');
    await fill(page, 'email', registered.email);
    await fill(page, 'password', `${registered.password}-wrong`);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expectToast(page, 'Incorrect email or password.');
    await expect(page.locator('app-otp')).toHaveCount(0);

    await mailpit.clear(registered.email);
    await fill(page, 'password', registered.password);
    await page.getByRole('button', { name: 'Continue' }).click();
    const sent = await mailpit.otpFor(registered.email);
    await submitOtp(page, sent === 'ZZZZZZ' ? 'YYYYYY' : 'ZZZZZZ');
    await expectToast(page, 'That verification code is invalid or has expired.');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a consumer resets a forgotten password with an emailed code and signs in with it', async ({
    page,
    mailpit,
    registered,
  }) => {
    const newPassword = 'Reset-by-email-Passw0rd!';
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);

    await mailpit.clear(registered.email);
    await fill(page, 'email', registered.email);
    await page.getByRole('button', { name: 'Send reset code' }).click();
    await expect(
      page.getByText('If the email is registered, a verification code has been sent.'),
    ).toBeVisible();
    await fill(page, 'otp', await mailpit.otpFor(registered.email));
    await fill(page, 'newPassword', newPassword);
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expectToast(page, 'Password reset. Please sign in.');
    await expect(page).toHaveURL(/\/login$/);

    await loginViaUi(page, mailpit, registered.email, newPassword);
  });
});
