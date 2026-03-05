const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { BRANCHES } = require('../config/branches');
const { getEnv } = require('../config/env');

async function ensureBootstrapAdminUser() {
  const env = getEnv();
  const email = String(env.bootstrapAdminEmail || '').toLowerCase().trim();
  const password = String(env.bootstrapAdminPassword || '').trim();

  if (!email || !password) {
    return;
  }

  const branch = BRANCHES.includes(env.bootstrapAdminBranch) ? env.bootstrapAdminBranch : BRANCHES[0];
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.findOne({ email });

  if (!user) {
    await User.create({
      name: env.bootstrapAdminName,
      email,
      passwordHash,
      role: 'admin',
      branch
    });
    console.log(`Bootstrap admin created: ${email}`);
    return;
  }

  user.name = env.bootstrapAdminName;
  user.passwordHash = passwordHash;
  user.role = 'admin';
  user.branch = branch;
  await user.save();
  console.log(`Bootstrap admin ensured: ${email}`);
}

module.exports = {
  ensureBootstrapAdminUser
};