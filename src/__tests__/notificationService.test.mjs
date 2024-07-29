import 'dotenv/config';
import NotificationService from '../notificationService.mjs';
import { jest } from '@jest/globals';

describe('NotificationService', () => {
  let notificationService;
  let redisClientMock;
  let mailgunMock;

  beforeEach(() => {
    redisClientMock = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };
    mailgunMock = {
      messages: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    notificationService = new NotificationService();
    notificationService.redisClient = redisClientMock;
    notificationService.mailgun = mailgunMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with correct rate limits', () => {
    expect(notificationService.rateLimits).toEqual(expect.any(Object));
  });

  test('should send notification successfully', async () => {
    redisClientMock.get.mockResolvedValue(null);
    redisClientMock.set.mockResolvedValue('OK');
    mailgunMock.send.mockResolvedValue({ id: '123', message: 'Queued. Thank you.' });

    await notificationService.sendNotification('test@example.com', 'status', 'Test message');

    expect(redisClientMock.connect).toHaveBeenCalled();
    expect(redisClientMock.get).toHaveBeenCalledWith('test@example.com:info');
    expect(redisClientMock.set).toHaveBeenCalledWith('test@example.com:info', 1, 'EX', expect.any(Number));
    expect(mailgunMock.send).toHaveBeenCalledWith({
      from: 'Your Service <no-reply@yourdomain.com>',
      to: 'test@example.com',
      subject: 'Notification: info',
      text: 'Test message',
    });
    expect(redisClientMock.disconnect).toHaveBeenCalled();
  });

  test('should throw error for invalid notification type', async () => {
    await expect(notificationService.sendNotification('test@example.com', 'invalid', 'Test message'))
      .rejects
      .toThrow('Invalid notification type');
  });

  test('should throw error when rate limit is exceeded', async () => {
    redisClientMock.get.mockResolvedValue('5');

    await expect(notificationService.sendNotification('test@example.com', 'status', 'Test message'))
      .rejects
      .toThrow('Rate limit exceeded');
  });
});