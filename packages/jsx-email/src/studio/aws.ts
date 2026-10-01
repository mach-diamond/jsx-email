import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
export type AwsSource = { profile?: string; region: string };
export type AwsRead = (service: string, operation: string, args?: string[]) => Promise<any>;

export const awsReader =
  (source: AwsSource): AwsRead =>
  async (service, operation, args = []) => {
    try {
      const result = await execute(
        'aws',
        [
          service,
          operation,
          ...args,
          '--region',
          source.region,
          ...(source.profile ? ['--profile', source.profile] : []),
          '--output',
          'json',
          '--no-cli-pager'
        ],
        {
          timeout: 20000,
          maxBuffer: 8 * 1024 * 1024,
          env: {
            ...process.env,
            AWS_EC2_METADATA_DISABLED: 'true',
            AWS_MAX_ATTEMPTS: '1',
            AWS_PAGER: ''
          }
        }
      );
      return JSON.parse(result.stdout);
    } catch (error) {
      const message = String((error as { stderr?: string }).stderr || error);
      if (/sso|token has expired/i.test(message))
        throw new TypeError(
          `AWS session expired. Run aws sso login${source.profile ? ` --profile ${source.profile}` : ''}, then refresh.`
        );
      if (/credentials|ENOENT/i.test(message))
        throw new TypeError(
          'AWS CLI or credentials unavailable. Install AWS CLI and sign in to the configured profile.'
        );
      if (/AccessDenied|Unauthorized/i.test(message))
        throw new TypeError(
          `AWS denied ${service}:${operation}. The configured profile needs read access.`
        );
      throw new TypeError(
        `AWS ${service}:${operation} failed. Check the configured profile, region, and network connection.`
      );
    }
  };
