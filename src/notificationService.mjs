import redis from 'redis';
import mailgun from 'mailgun-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load rate limits from JSON file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rateLimits = JSON.parse(fs.readFileSync(path.join(__dirname,'..', 'data', 'notificationsConfig.json'), 'utf8'));

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

client.on('error', (err) => {
  console.error('Redis client error:', err);
});
client.connect();
// const getAsync = promisify(client.get).bind(client);
// const setAsync = promisify(client.set).bind(client);

const mg = mailgun({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN });

/**
 * NotificationService class to handle sending notifications with rate limiting
 */
class NotificationService {
  constructor() {
    this.rateLimits = rateLimits;
  }

  /**
   * Send a notification
   * @param {string} recipient - The recipient of the notification
   * @param {string} type - The type of the notification
   * @param {string} message - The message of the notification
   * @throws Will throw an error if the rate limit is exceeded
   */
  async sendNotification(recipient, type, message) {

    const rateLimit = this.rateLimits[type];
    console.log(rateLimit);
    if (!rateLimit) {
      throw new Error('Invalid notification type');
    }

    const key = `${recipient}:${type}`;
    const count = await client.get(key);
    console.log('count:', count);
    if (count && count >= rateLimit.limit) {
      throw new Error('Rate limit exceeded');
    }

    await client.set(key, (count ? parseInt(count) + 1 : 1), 'EX', rateLimit.duration);

    // Send the notification using Mailgun
    const data = {
      from: 'Your Service <no-reply@yourdomain.com>',
      to: recipient,
      subject: `Notification: ${type}`,
      text: message,
    };

    await mg.messages().send(data);
  }
}

export default NotificationService;