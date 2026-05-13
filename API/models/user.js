class User {
  constructor(password, email, isAdmin = false, personalData = {}, shippingAddress = {}) {
    this.email = String(email || '').trim();
    this.password = password;
    this.isAdmin = Boolean(isAdmin);
    this.personalData = this.normalizePersonalData(personalData);
    this.shippingAddress = this.normalizeShippingAddress(shippingAddress);
  }

  normalizePersonalData(personalData) {
    const source = personalData && typeof personalData === 'object' ? personalData : {};

    return {
      firstName: String(source.firstName || '').trim(),
      lastName: String(source.lastName || '').trim(),
      email: String(source.email || '').trim(),
      phone: String(source.phone || '').trim(),
      documentId: String(source.documentId || '').trim(),
    };
  }

  normalizeShippingAddress(shippingAddress) {
    const source = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : {};

    return {
      street: String(source.street || '').trim(),
      city: String(source.city || '').trim(),
      zipCode: String(source.zipCode || '').trim(),
      country: String(source.country || '').trim(),
    };
  }
}

module.exports = User;
