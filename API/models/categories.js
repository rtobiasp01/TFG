class Category {
  constructor({
    name = '',
    description = '',
    visible = true,
  } = {}) {
    this.name = String(name).trim();
    this.description = String(description).trim();
    this.visible = Boolean(visible);
    this.created_at = new Date();
  }
}

module.exports = Category;
