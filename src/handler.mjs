import NotificationService from './notificationService.mjs';

/**
 * Lambda function to send notifications
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 * @returns {Object} - API Gateway Lambda Proxy Output Format
 */
export const sendNotification = async (event) => {
  const { recipient, type, message } = JSON.parse(event.body);
  const notificationService = new NotificationService();

  try {
    await notificationService.sendNotification(recipient, type, message);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notification sent successfully' }),
    };
  } catch (error) {
    return {
      statusCode: 429,
      body: JSON.stringify({ message: error.message }),
    };
  }
};