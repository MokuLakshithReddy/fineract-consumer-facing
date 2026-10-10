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

import { APIRequestContext, expect, request } from '@playwright/test';
import { MAILPIT_URL } from './env';

/** The BFF's OTP email body: "Your verification code is: XXXXXX". */
const OTP_PATTERN = /Your verification code is: ([A-Z0-9]{6})/;

/**
 * Reads one-time passwords from Mailpit, the SMTP sink the e2e stack sends every BFF email to.
 *
 * The BFF keeps one pending OTP per user, and a new challenge replaces the old one. Callers
 * therefore clear the recipient's inbox before the action that sends a code, then wait for the
 * single message that action produces.
 */
export class Mailpit {
  private constructor(private readonly api: APIRequestContext) {}

  static async connect(): Promise<Mailpit> {
    return new Mailpit(await request.newContext({ baseURL: MAILPIT_URL }));
  }

  async clear(recipient: string): Promise<void> {
    const response = await this.api.delete('/api/v1/search', {
      params: { query: `to:${recipient}` },
    });
    expect(response.ok(), `clearing Mailpit for ${recipient}`).toBeTruthy();
  }

  /** Waits for the OTP email to `recipient` and returns the code. */
  async otpFor(recipient: string): Promise<string> {
    let code: string | undefined;
    await expect
      .poll(
        async () => {
          code = await this.latestOtp(recipient);
          return code;
        },
        { message: `OTP email for ${recipient}`, timeout: 20_000, intervals: [250, 500, 1000] },
      )
      .toBeTruthy();
    return code!;
  }

  async dispose(): Promise<void> {
    await this.api.dispose();
  }

  private async latestOtp(recipient: string): Promise<string | undefined> {
    const search = await this.api.get('/api/v1/search', { params: { query: `to:${recipient}` } });
    const messages = (await search.json()).messages as { ID: string }[] | undefined;
    if (!messages?.length) {
      return undefined;
    }
    const message = await this.api.get(`/api/v1/message/${messages[0].ID}`);
    return OTP_PATTERN.exec((await message.json()).Text ?? '')?.[1];
  }
}
