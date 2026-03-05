const users = [];

// In-memory helper store (mainly for simple/local flows).
function findByEmail(email) {
  return users.find((user) => user.email === email.toLowerCase()) || null;
}

function findById(id) {
  return users.find((user) => user.id === id) || null;
}

function createUser(user) {
  users.push(user);
  return user;
}

module.exports = {
  findByEmail,
  findById,
  createUser
};
