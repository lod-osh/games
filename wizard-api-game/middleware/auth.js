const db = require('../db');

const getWizardByKey = db.prepare('SELECT * FROM wizards WHERE api_key = ?');

module.exports = function auth(req, res, next) {
  const isCreate = req.method === 'POST' && req.path === '/wizard';
  if (isCreate) return next();

  const header = req.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const key = match ? match[1].trim() : null;

  const wizard = key ? getWizardByKey.get(key) : null;
  if (!wizard) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  req.wizard = wizard;
  next();
};
