const pool = require('../config/db');

const Notification = {
  create: (userId, title, message) =>
    pool.query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1,$2,$3) RETURNING *',
      [userId, title, message]
    ).then(r => r.rows[0]),

  findByUser: (userId) =>
    pool.query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    ).then(r => r.rows),

  markRead: (notificationId, userId) =>
    pool.query(
      'UPDATE notifications SET is_read=TRUE WHERE notification_id=$1 AND user_id=$2',
      [notificationId, userId]
    ),
};

module.exports = Notification;
