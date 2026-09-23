/**
 * Notification Controller
 */

const notificationService = require('../services/notificationService');

function getNotifications(req, res) {
  const userId = req.query.userId || 'default';
  const result = notificationService.getNotifications(userId);
  res.json({
    success: true,
    data: result.notifications,
    unreadCount: result.unreadCount,
    totalCount: result.totalCount
  });
}

function markNotificationAsRead(req, res) {
  const { id } = req.params;
  const success = notificationService.markAsRead(id);
  if (!success) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }
  res.json({ success: true, message: 'Notification marked as read' });
}

function markAllNotificationsAsRead(req, res) {
  const userId = req.body.userId || 'default';
  notificationService.markAllAsRead(userId);
  res.json({ success: true, message: 'All notifications marked as read' });
}

function saveSubscription(req, res) {
  const { subscription, userId = 'default' } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, message: 'Invalid push subscription object' });
  }
  notificationService.savePushSubscription(subscription, userId);
  res.json({ success: true, message: 'Push subscription registered successfully' });
}

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  saveSubscription
};
