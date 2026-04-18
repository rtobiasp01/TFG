class User {
  constructor(password, email, isAdmin = false) {
    this.email = email;
    this.password = password;
    this.isAdmin = Boolean(isAdmin);
  }
}

module.exports = User;
