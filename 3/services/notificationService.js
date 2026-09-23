/**
 * Notification Service for KisanSahay
 * Handles in-app notifications, daily EMI due reminders (7 days and 1 day before),
 * new scheme alerts, and browser push notification subscriptions.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DATA_DIR = path.join(__dirname, '..', '..', 'Data', 'Data');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push_subscriptions.json');
const LOANS_FILE = path.join(DATA_DIR, 'loans.json');
const SRC_NOTIFS_FILE = path.join(__dirname, '..', 'data', 'notifications.json');

// Ensure directory and files exist
function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    // Seed initial welcome & sample notification
    const initial = [
      {
        id: 'notif-welcome',
        userId: 'default',
        type: 'system',
        title: '🌱 Welcome to KisanSahay Portal',
        message: 'Your official portal for transparent agricultural credit, interest subvention, and farmer subsidies.',
        read: false,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'notif-kcc-feature',
        userId: 'default',
        type: 'new_scheme',
        title: '🌾 Kisan Credit Card (KCC) 4% Subvention Active',
        message: 'Prompt repayment subvention is now active. Pay your crop loan on time to enjoy a net 4% annual interest rate.',
        read: false,
        createdAt: new Date(Date.now() - 1800000).toISOString()
      }
    ];
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(initial, null, 2), 'utf8');
    try {
      fs.writeFileSync(SRC_NOTIFS_FILE, JSON.stringify(initial, null, 2), 'utf8');
    } catch (e) {}
  }

  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

function readNotifications() {
  ensureFiles();
  try {
    const raw = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    logger.error('Failed to read notifications file', { error: err.message });
    return [];
  }
}

function writeNotifications(data) {
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
    try {
      fs.writeFileSync(SRC_NOTIFS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {}
    return true;
  } catch (err) {
    logger.error('Failed to write notifications file', { error: err.message });
    return false;
  }
}

function readSubscriptions() {
  ensureFiles();
  try {
    const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeSubscriptions(data) {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Get notifications for a user, sorted newest first
 */
function getNotifications(userId = 'default') {
  const all = readNotifications();
  const filtered = all
    .filter(n => !n.userId || n.userId === 'default' || n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unreadCount = filtered.filter(n => !n.read).length;

  return {
    notifications: filtered,
    unreadCount,
    totalCount: filtered.length
  };
}

/**
 * Create a new notification
 */
function createNotification(notif) {
  const all = readNotifications();
  const newNotif = {
    id: notif.id || 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    userId: notif.userId || 'default',
    type: notif.type || 'system',
    title: notif.title || 'KisanSahay Notification',
    message: notif.message || '',
    link: notif.link || null,
    loanId: notif.loanId || null,
    schemeId: notif.schemeId || null,
    milestone: notif.milestone || null,
    read: false,
    createdAt: notif.createdAt || new Date().toISOString()
  };

  all.unshift(newNotif);
  writeNotifications(all);

  logger.info('Created notification', { id: newNotif.id, type: newNotif.type, title: newNotif.title });
  return newNotif;
}

/**
 * Mark a single notification as read
 */
function markAsRead(id) {
  const all = readNotifications();
  let found = false;
  const updated = all.map(n => {
    if (n.id === id) {
      found = true;
      return { ...n, read: true };
    }
    return n;
  });

  if (found) {
    writeNotifications(updated);
  }
  return found;
}

/**
 * Mark all notifications as read for a user
 */
function markAllAsRead(userId = 'default') {
  const all = readNotifications();
  const updated = all.map(n => {
    if (!n.userId || n.userId === 'default' || n.userId === userId) {
      return { ...n, read: true };
    }
    return n;
  });

  writeNotifications(updated);
  return true;
}

/**
 * Save browser web push subscription
 */
function savePushSubscription(subscription, userId = 'default') {
  const subs = readSubscriptions();
  const exists = subs.find(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push({
      ...subscription,
      userId,
      subscribedAt: new Date().toISOString()
    });
    writeSubscriptions(subs);
  }
  return true;
}

/**
 * Check active loans and generate daily EMI reminders (7 days and 1 day before due date)
 */
function checkDueLoansAndNotify(loansList = null) {
  let rawLoans = [];
  if (Array.isArray(loansList)) {
    rawLoans = loansList;
  } else if (fs.existsSync(LOANS_FILE)) {
    try {
      rawLoans = JSON.parse(fs.readFileSync(LOANS_FILE, 'utf8'));
    } catch (e) {
      rawLoans = [];
    }
  }

  const allNotifs = readNotifications();
  const createdReminders = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  rawLoans.forEach(loan => {
    const isEnded = (loan.status && loan.status.toLowerCase() === 'ended') || Number(loan.dueAmount) === 0;
    if (isEnded) return; // Only process active loans with due balance

    const dueStr = loan.nextEmiDate || loan.dueDate;
    if (!dueStr) return;
    const dueDate = new Date(dueStr);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const emiFormatted = '₹' + Number(loan.monthlyEmi || loan.emiAmount || 0).toLocaleString('en-IN');
    const schemeTitle = loan.schemeName || 'Agricultural Loan';

    // 1. Check 7-day reminder milestone (7 days away, or between 2 and 7 days)
    if (diffDays <= 7 && diffDays > 1) {
      const milestoneId = `emi-7d-${loan.id}-${dueStr}`;
      const alreadyNotified = allNotifs.some(n => n.milestone === milestoneId || (n.loanId === loan.id && n.milestone === '7d' && n.message.includes(dueStr)));

      if (!alreadyNotified) {
        const notif = createNotification({
          id: 'notif-' + Date.now() + '-7d',
          type: 'emi_reminder',
          title: `⏰ Upcoming EMI Due in ${diffDays} Days`,
          message: `Your monthly EMI of ${emiFormatted} for ${schemeTitle} is due on ${dueStr}. Keep funds ready in your bank account.`,
          loanId: loan.id,
          milestone: milestoneId,
          link: '#tracker'
        });
        createdReminders.push(notif);
      }
    }

    // 2. Check 1-day reminder milestone (due tomorrow or today)
    if (diffDays <= 1 && diffDays >= 0) {
      const milestoneId = `emi-1d-${loan.id}-${dueStr}`;
      const alreadyNotified = allNotifs.some(n => n.milestone === milestoneId || (n.loanId === loan.id && n.milestone === '1d' && n.message.includes(dueStr)));

      if (!alreadyNotified) {
        const notif = createNotification({
          id: 'notif-' + Date.now() + '-1d',
          type: 'emi_reminder',
          title: `🚨 Urgent: EMI Due ${diffDays === 0 ? 'Today' : 'Tomorrow'}!`,
          message: `Urgent Reminder: EMI payment of ${emiFormatted} for ${schemeTitle} is due ${diffDays === 0 ? 'today' : 'tomorrow (' + dueStr + ')'}. Pay on time to retain your prompt repayment subvention!`,
          loanId: loan.id,
          milestone: milestoneId,
          link: '#tracker'
        });
        createdReminders.push(notif);
      }
    }
  });

  return createdReminders;
}

function checkEmiDueReminders() {
  return checkDueLoansAndNotify();
}

/**
 * Start the daily scheduled job for EMI reminders
 */
let schedulerInterval = null;

function startScheduledReminders() {
  ensureFiles();
  // Run once immediately on start
  checkEmiDueReminders();

  // Run daily check every 24 hours (86,400,000 ms)
  if (!schedulerInterval) {
    schedulerInterval = setInterval(() => {
      checkEmiDueReminders();
    }, 24 * 60 * 60 * 1000);
  }
}

module.exports = {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  savePushSubscription,
  checkDueLoansAndNotify,
  checkEmiDueReminders,
  startScheduledReminders
};
